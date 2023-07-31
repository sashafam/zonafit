import { config as dotenvConfig } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import TelegramBot = require('node-telegram-bot-api');

dotenvConfig();

const supabaseUrl: string = process.env.SUPABASE_URL!;
const supabaseKey: string = process.env.SUPABASE_KEY!;
const chatId: string = process.env.TELEGRAM_CHAT_ID!;
const telegramToken: string = process.env.TELEGRAM_TOKEN!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  persistSession: false, 
});
const bot = new TelegramBot(telegramToken, { polling: false });

export { bot, chatId, supabase };
