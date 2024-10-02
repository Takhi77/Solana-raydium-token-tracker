import {
    Connection,
    PublicKey,
} from '@solana/web3.js'
import axios, { AxiosResponse } from 'axios';
const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=938bea3c-b707-43ce-a59f-1eb2695f759b"
const RPC_WEBSOCKET_ENDPOINT = "wss://mainnet.helius-rpc.com/?api-key=938bea3c-b707-43ce-a59f-1eb2695f759b"

const solanaConnection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
})

// ============ Setting Part Start ================ //

const tgToken: string = '7131075508:AAEtzeV-9pJynpwPEHh2L7y79Y_uonacUt0'
const chatId: string = '@token_tracky'
const baseMint: PublicKey = new PublicKey("So11111111111111111111111111111111111111112")
// const baseMintUSDC: PublicKey = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")   // USDC
const tokenMint: PublicKey = new PublicKey('7gKKuhBUQzgsWcMt9vuAaazrdN6wcNveRYcwyZFfJWYF')
// const poolId: PublicKey = new PublicKey('7oguisXbogr7o3o713dpe1PH2uwixtLBi4zabmAPvGsW')
const poolOwnerAMM: PublicKey = new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1')  // Raydium Authority V4 AMM
const poolOwnerCPMM: PublicKey = new PublicKey("GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL") // CPMM POOL Auth
const baseVault: PublicKey = new PublicKey("47sYQ5NLPDQT9MSbbo4AjJKC9kZstoLR5TjtQgbpX76e")
const quoteVault: PublicKey = new PublicKey("2Rds65yitqk1ZZ1yVqKFgopvMjN7rRUYnmtEHFus7JRb")
const TOKEN_NAME: string = "MGL"
const WISH_WORD: string = "Hurray!"
// const WISH_WORD_1: string = " --- this part? --- "
const SHOW_BUY = true
const SHOW_SELL = true
const IS_AMM = false

// ============ Setting Part End ================ //

interface TelegramResponse {
    ok: boolean;
    result: {
        message_id: number;
        chat: {
            id: number;
            title: string;
            type: string;
        };
        date: number;
        text: string;
    };
}

// Function to format the address of the buyers
export const obfuscateString = (input: string): string => {
    if (input.length <= 8) {
        return input; // If the string is too short, return it as is
    }

    const firstPart = input.substring(0, 4); // First 4 characters
    const lastPart = input.substring(input.length - 4); // Last 4 characters

    return `${firstPart}****${lastPart}`;
}

// Function to send the message to the Telegram through the bot
export const sendMessageToTelegram = async (message: string): Promise<void> => {
    const url: string = `https://api.telegram.org/bot${tgToken}/sendMessage`;
    try {
        const response: AxiosResponse<TelegramResponse> = await axios.post(url, {
            chat_id: chatId,
            text: `${message}`,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Buy Now',
                            url: `https://raydium.io/swap/?inputMint=sol&outputMint=${tokenMint}` // Replace with your actual buy link
                        }
                    ]
                ]
            }
        });

        if (response.data.ok) {
            // console.log('Message sent successfully:', response.data.result);
        } else {
            console.error('Failed to send message:', response.data);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
};

const runListener = async () => {

    solanaConnection.onLogs(
        baseVault,
        async ({ logs, err, signature }) => {
            if (err) { console.log(err) }
            else {
                console.log(logs)
                try {

                    const parsedData = await solanaConnection.getParsedTransaction(signature,
                        {
                            maxSupportedTransactionVersion: 0,
                            commitment: "confirmed"
                        }
                    )

                    await sleep(2000)

                    const postTokenBal = parsedData?.meta?.postTokenBalances
                    const preTokenBal = parsedData?.meta?.preTokenBalances
                    const accounts = parsedData?.transaction.message.accountKeys
                    const buyer = accounts![0].pubkey.toBase58()

                    if (postTokenBal && preTokenBal) {
                        let postQuoteBal: number = 0
                        let postBaseBal: number = 0
                        let preQuoteBal: number = 0
                        let preBaseBal: number = 0

                        postTokenBal.forEach((eachBal) => {
                            if(IS_AMM ? eachBal.owner == poolOwnerAMM.toBase58() : eachBal.owner == poolOwnerCPMM.toBase58() && eachBal.mint == baseMint.toBase58()) {
                                postBaseBal = eachBal.uiTokenAmount.uiAmount!
                            }
                            if(IS_AMM ? eachBal.owner == poolOwnerAMM.toBase58() : eachBal.owner == poolOwnerCPMM.toBase58() && eachBal.mint == tokenMint.toBase58()) {
                                postQuoteBal = eachBal.uiTokenAmount.uiAmount!
                            }
                        })

                        preTokenBal.forEach((eachBal) => {
                            if(IS_AMM ? eachBal.owner == poolOwnerAMM.toBase58() : eachBal.owner == poolOwnerCPMM.toBase58() && eachBal.mint == baseMint.toBase58()) {
                                preBaseBal = eachBal.uiTokenAmount.uiAmount!
                            }
                            if(IS_AMM ? eachBal.owner == poolOwnerAMM.toBase58() : eachBal.owner == poolOwnerCPMM.toBase58() && eachBal.mint == tokenMint.toBase58()) {
                                preQuoteBal = eachBal.uiTokenAmount.uiAmount!
                            }
                        })
                        
                        const dTokenBal = postQuoteBal! - preQuoteBal!
                        const dSolBal = postBaseBal! - preBaseBal!

                        const buyerAddressFormatted = obfuscateString(buyer);

                        if (dSolBal > 0) {
                            const message = `🎉 ${WISH_WORD} ${buyerAddressFormatted}\n` +
                                `💵 Spent: ${dSolBal} SOL\n` +
                                `💎 Got: ${-(dTokenBal.toFixed(2))} ${TOKEN_NAME}\n\n` +
                                `Congratulations! ${buyerAddressFormatted} has qualified for our $1000 Presale Draw\n\n` +
                                `Buy minimum of 0.00859 BNB now to qualify too! ⬇️`;
                            if (SHOW_BUY) sendMessageToTelegram(message);
                            console.log(message)
                        }
                        else if (dSolBal < 0) {
                            const message = `🎉 ${WISH_WORD} ${buyerAddressFormatted}\n` +
                                `💎 Spent: ${dTokenBal.toFixed(2)} ${TOKEN_NAME}\n` +
                                `💵 Got: ${-dSolBal} SOL\n\n` +
                                `Congratulations! ${buyerAddressFormatted} has qualified for our $1000 Presale Draw\n\n` +
                                `Buy minimum of 0.00859 BNB now to qualify too! ⬇️`;
                            if (SHOW_SELL) sendMessageToTelegram(message);
                            console.log(message)
                        }
                    }
                } catch (error) {
                    console.log(error)
                }
            }
        },
        "confirmed"
    )

    console.log('----------------------------------------')
    console.log('Bot is running! Press CTRL + C to stop it.')
    console.log('----------------------------------------')
}

const sleep = async (ms: number) => {
    await new Promise((resolve) => setTimeout(resolve, ms))
}

runListener()

console.log('Bot and blockchain listener are running...');