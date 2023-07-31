"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const supabase_js_1 = require("@supabase/supabase-js");
class Scraper {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            persistSession: false,
        });
        this.baseUrl = 'https://zonafit.co/categoria-producto/ofertas/ver-todas-las-ofertas/';
        this.itemsPerPage = 30;
    }
    extractDataFromPage(html) {
        return __awaiter(this, void 0, void 0, function* () {
            const $ = cheerio_1.default.load(html);
            const productlist = [];
            const uniqueProducts = new Set();
            // Use the class "box-text-products" to target each product box
            $('.box-text-products').each((index, element) => {
                const name = $(element).find('.product-title').text().trim();
                let price = $(element).find('.price ins .woocommerce-Price-amount').text().trim();
                if (!price) {
                    price = $(element).find('.price .woocommerce-Price-amount bdi').text().trim();
                }
                const numericPrice = parseFloat(price.split('.')[0].replace(/[^\d.]/g, ''));
                const productUrl2 = $(element).find('.product-title a').attr('href');
                const productKey = name + numericPrice + productUrl2;
                if (!uniqueProducts.has(productKey)) {
                    const productObj = {
                        name: name,
                        price: numericPrice,
                        productUrl2: productUrl2 || '',
                    };
                    productlist.push(productObj);
                    uniqueProducts.add(productKey);
                }
            });
            console.log('Unique Products:', [...uniqueProducts]);
            return productlist;
        });
    }
    scrapeData() {
        return __awaiter(this, void 0, void 0, function* () {
            let currentPage = 1;
            let allData = [];
            while (true) {
                try {
                    const url = currentPage === 1 ? this.baseUrl : `${this.baseUrl}page/${currentPage}/`;
                    const response = yield axios_1.default.get(url);
                    if (response.status !== 200) {
                        console.error(`Error: Unable to fetch data from page ${currentPage}`);
                        break;
                    }
                    const data = yield this.extractDataFromPage(response.data);
                    if (data.length === 0) {
                        break;
                    }
                    allData = [...allData, ...data];
                    currentPage++;
                }
                catch (error) {
                    console.error(`Error: ${error.message}`);
                    break;
                }
            }
            return allData;
        });
    }
    sendDataToSupabase() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield this.scrapeData();
                // Combine all unique products into a single array
                const combinedUniqueProducts = data.reduce((result, product) => {
                    const existingProductIndex = result.findIndex((existingProduct) => existingProduct.name === product.name &&
                        existingProduct.price === product.price &&
                        existingProduct.productUrl2 === product.productUrl2);
                    if (existingProductIndex === -1) {
                        result.push(product);
                    }
                    return result;
                }, []);
                const { data: insertedData, error } = yield this.supabase.from('zonafit').insert(combinedUniqueProducts);
                if (error) {
                    console.error('Error inserting data:', error);
                }
                else {
                    console.log('Data inserted successfully:', insertedData);
                }
            }
            catch (error) {
                console.error('Error sending data to Supabase:', error);
            }
        });
    }
}
// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
// Instantiate the scraper and send data to Supabase
const scraper = new Scraper(supabaseUrl, supabaseKey);
// Function to fetch and send data to Supabase every 30 seconds
const fetchDataAndSendToSupabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield scraper.sendDataToSupabase();
        console.log('Data sent to Supabase.');
    }
    catch (error) {
        console.error('Error sending data to Supabase:', error);
    }
});
// Initial execution
fetchDataAndSendToSupabase();
// Run fetchDataAndSendToSupabase every 30 seconds
const intervalTime = 4 * 60 * 60 * 1000; // 30 seconds in milliseconds
setInterval(fetchDataAndSendToSupabase, intervalTime);
