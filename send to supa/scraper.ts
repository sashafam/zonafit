import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import cheerio from 'cheerio';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface Product {
  name: string;
  price: number;
  productUrl2: string;
}

class Scraper {
  private supabase: SupabaseClient;
  private baseUrl: string;
  private itemsPerPage: number;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      persistSession: false,
    });
    this.baseUrl = 'https://zonafit.co/categoria-producto/ofertas/ver-todas-las-ofertas/';
    this.itemsPerPage = 30;
  }

  private async extractDataFromPage(html: string): Promise<Product[]> {
    const $ = cheerio.load(html);

    const productlist: Product[] = [];
    const uniqueProducts = new Set<string>();

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
        const productObj: Product = {
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
  }

  private async scrapeData(): Promise<Product[]> {
    let currentPage = 1;
    let allData: Product[] = [];

    while (true) {
      try {
        const url = currentPage === 1 ? this.baseUrl : `${this.baseUrl}page/${currentPage}/`;
        const response = await axios.get(url);

        if (response.status !== 200) {
          console.error(`Error: Unable to fetch data from page ${currentPage}`);
          break;
        }

        const data = await this.extractDataFromPage(response.data);
        if (data.length === 0) {
          break;
        }

        allData = [...allData, ...data];
        currentPage++;
      } catch (error) {
        console.error(`Error: ${error.message}`);
        break;
      }
    }

    return allData;
  }

  public async sendDataToSupabase(): Promise<void> {
    try {
      const data = await this.scrapeData();

      // Combine all unique products into a single array
      const combinedUniqueProducts = data.reduce((result, product) => {
        const existingProductIndex = result.findIndex(
          (existingProduct) =>
            existingProduct.name === product.name &&
            existingProduct.price === product.price &&
            existingProduct.productUrl2 === product.productUrl2
        );

        if (existingProductIndex === -1) {
          result.push(product);
        }

        return result;
      }, []);

      const { data: insertedData, error } = await this.supabase.from<Product>('zonafit').insert(combinedUniqueProducts);

      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('Data inserted successfully:', insertedData);
      }
    } catch (error) {
      console.error('Error sending data to Supabase:', error);
    }
  }
}

// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Instantiate the scraper and send data to Supabase
const scraper = new Scraper(supabaseUrl, supabaseKey);

// Function to fetch and send data to Supabase every 30 seconds
const fetchDataAndSendToSupabase = async () => {
  try {
    await scraper.sendDataToSupabase();
    console.log('Data sent to Supabase.');
  } catch (error) {
    console.error('Error sending data to Supabase:', error);
  }
};

// Initial execution
fetchDataAndSendToSupabase();

// Run fetchDataAndSendToSupabase every 30 seconds
const intervalTime = 4 * 60 * 60 * 1000; // 30 seconds in milliseconds
setInterval(fetchDataAndSendToSupabase, intervalTime);
