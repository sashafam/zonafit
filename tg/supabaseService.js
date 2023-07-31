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
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
class ProductService {
    constructor() {
        this.previousResults = [];
    }
    sendDataToSupabase2() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data: prices, error } = yield config_1.supabase
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
                const productMap = new Map();
                for (const product of prices) {
                    if (!productMap.has(product.name)) {
                        productMap.set(product.name, { latest: product, previous: null });
                    }
                    else {
                        const existingProduct = productMap.get(product.name);
                        if (!existingProduct.latest || product.id > existingProduct.latest.id) {
                            existingProduct.previous = existingProduct.latest;
                            existingProduct.latest = product;
                        }
                        else if (!existingProduct.previous || product.id > existingProduct.previous.id) {
                            existingProduct.previous = product;
                        }
                        productMap.set(product.name, existingProduct);
                    }
                }
                const results = [];
                for (const [name, { latest, previous }] of productMap.entries()) {
                    if (latest && previous) {
                        const priceDifference = latest.price - previous.price;
                        if (priceDifference !== 0) {
                            results.push({ name, priceDifference, productUrl2: latest.productUrl2 });
                        }
                    }
                    else {
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
                        yield config_1.bot.sendMessage(config_1.chatId, message);
                    }
                }
            }
            catch (error) {
                console.error('Error calculating price difference:', error);
            }
        });
    }
    sendAndSchedule() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.sendDataToSupabase2();
            }
            catch (error) {
                console.error('Error:', error);
            }
            finally {
                setTimeout(this.sendAndSchedule.bind(this), 30000);
            }
        });
    }
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    const productService = new ProductService();
    productService.sendAndSchedule();
}))();
