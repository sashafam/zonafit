import { supabase, bot, chatId } from './config';

interface Product {
  name: string;
  price: number;
  id: number;
  productUrl2: string;
}

class ProductService {
  private previousResults: Product[] = [];

  private async sendDataToSupabase2() {
    try {
      const { data: prices, error } = await supabase
        .from('zonafit')
        .select('name, price, id, productUrl2')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching data:', error);
        return;
      }

      if (!prices || prices.length < 2) {
        console.error('Not enough data to calculate difference');
        return;
      }

      const productMap = new Map<string, { latest: Product, previous: Product | null }>();

      for (const product of prices) {
        if (!productMap.has(product.name)) {
          productMap.set(product.name, { latest: product, previous: null });
        } else {
          const existingProduct = productMap.get(product.name)!;
          if (!existingProduct.latest || product.id > existingProduct.latest.id) {
            existingProduct.previous = existingProduct.latest;
            existingProduct.latest = product;
          } else if (!existingProduct.previous || product.id > existingProduct.previous.id) {
            existingProduct.previous = product;
          }
          productMap.set(product.name, existingProduct);
        }
      }

      const results: Product[] = [];

      for (const [name, { latest, previous }] of productMap.entries()) {
        if (latest && previous) {
          const priceDifference = latest.price - previous.price;
          if (priceDifference !== 0) {
            results.push({ name, priceDifference, productUrl2: latest.productUrl2 });
          }
        } else {
          console.error(`Unable to find the latest and previous products for ${name}`);
        }
      }

      results.sort((a, b) => a.priceDifference - b.priceDifference);

      const isSameResults = JSON.stringify(results) === JSON.stringify(this.previousResults);
      this.previousResults = results;

      if (!isSameResults) {
        let message = '';
        for (const { name, priceDifference, productUrl2 } of results) {
          const priceDescription = priceDifference > 0 ? 'higher price' : 'lower price';
          message += `Product: ${name}, Price Difference: ${priceDifference > 0 ? '+' : ''}${priceDifference} (${priceDescription}), Product URL: ${productUrl2}\n`;
        }
        if (message !== '') {
          await bot.sendMessage(chatId, message);
        }
      }
    } catch (error) {
      console.error('Error calculating price difference:', error);
    }
  }

  public async sendAndSchedule() {
    try {
      await this.sendDataToSupabase2();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setTimeout(this.sendAndSchedule.bind(this), 30000);
    }
  }
}

(async () => {
  const productService = new ProductService();
  productService.sendAndSchedule();
})();
