import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function downloadImage(url, imagePath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });

    const writer = fs.createWriteStream(imagePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function getDataFromWebPage(){
    const browser = await puppeteer.launch({
        headless: "new",
    });

    const page = await browser.newPage();

    await page.goto('https://www.instagram.com/google/');

    await page.waitForTimeout(5000);

    const result = await page.evaluate(() => {
        const usuario = document.querySelector('h2').innerText;
        const data = [...document.querySelectorAll('span._ac2a')].map(elem => elem.outerText);
        const descripcion = document.querySelector('._aa_c').innerText;
        const imgSrc = document.querySelector('header img').getAttribute('src');
        return {
            usuario,
            publicaciones: data[0],
            seguidores: data[1],
            siguiendo: data[2],
            descripcion,
            imgSrc
        }
    });

    const date = new Date();
    const formattedDate = `${date.getFullYear()}${date.getMonth()+1}${date.getDate()}_${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
    //const imagePath = path.resolve(__dirname, `screenshot/${result.usuario}_${formattedDate}.jpg`);
    const imagePath = path.resolve(__dirname, `screenshot/${result.usuario}.jpg`);

    await downloadImage(result.imgSrc, imagePath);

    const url = 'http://127.0.0.1:8090/api/collections/logs/records';

    let formData = new FormData();
    formData.append('perfil', fs.createReadStream(imagePath));
    formData.append('usuario', result.usuario);
    formData.append('publicaciones', result.publicaciones);
    formData.append('seguidores', result.seguidores);
    formData.append('siguiendo', result.siguiendo);
    formData.append('descripcion', result.descripcion);

    const config = {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    };

    try {
        const response = await axios.post(url, formData, config);
        //console.log(response.data);
        console.log(`Datos enviados ${result.usuario}`)
    } catch (error) {
        console.error(error);
    }
    
    await browser.close();
}

getDataFromWebPage();
