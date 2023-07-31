"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.chatId = exports.bot = void 0;
const dotenv_1 = require("dotenv");
const supabase_js_1 = require("@supabase/supabase-js");
const TelegramBot = require("node-telegram-bot-api");
(0, dotenv_1.config)();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const chatId = process.env.TELEGRAM_CHAT_ID;
exports.chatId = chatId;
const telegramToken = process.env.TELEGRAM_TOKEN;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    persistSession: false,
});
exports.supabase = supabase;
const bot = new TelegramBot(telegramToken, { polling: false });
exports.bot = bot;
