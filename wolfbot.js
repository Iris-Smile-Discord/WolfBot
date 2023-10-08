const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const { Client, GatewayIntentBits } = require('discord.js');
    const client = new Client({ intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.DirectMessageTyping,
        ],
     });
//const config = require('./config.json');
//const prefix = config.prefix;
require('dotenv').config();

const prefix = process.env.PREFIX; // Access the PREFIX variable from .env
const discordToken = process.env.DISCORD_TOKEN; // Access the DISCORD_TOKEN variable from .env
const topggToken = process.env.TOPGG_TOKEN; // Access the TOPGG_TOKEN variable from .env
const patreonLink = process.env.PATREON_LINK; // Access the PATREON_LINK variable from .env
const kofiLink = process.env.KOFI_LINK; // Access the KOFI_LINK variable from .env
const paypalLink = process.env.PAYPAL_LINK; // Access the PAYPAL_LINK variable from .env

// Player data storage (you can use a database for more complex games).
const players = new Map();

// Define game locations.
const locations = ['forest', 'mountains', 'plains'];

// Define possible events in each location.
const locationEvents = {
  forest: ['found a rabbit', 'found a squirrel', 'found some berries', 'encountered a wolf'],
  mountains: ['found a deer', 'found a cave', 'encountered a mountain goat'],
  plains: ['found a rabbit', 'found a pond', 'encountered a fox'],
};

// Define the day-night cycle.
const dayNightCycle = ['day', 'night'];
let currentCycle = 0; // 0 for day, 1 for night.

// Define rewards for leveling up and winning hunting challenges.
const rewards = {
  levelUp: {
    points: 50, // Points awarded when leveling up.
    energy: 30, // Energy restored when leveling up.
  },
  challengeWin: {
    points: 20, // Points awarded when winning a hunting challenge.
  },
};

// Event handler for when the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({ status: 'online', activities: [{ name: '!ping for help' }] });
  // Start the day-night cycle timer.
    startDayNightCycle();
});

// Event handler for new messages
client.on('messageCreate', (message) => {
  console.log(`Received message: ${message.content}`);
  if (message.author.bot) return; // Ignore messages from other bots

  if (message.content === '!ping') {
    message.reply('Use `!hunt` command to start playing!\nOther commands:\n`!explore`, `!stats` and `!rest`.');
  }

 if (message.content.startsWith(`${prefix}hunt`)) {
     const playerId = message.author.id;
     if (!players.has(playerId)) {
       players.set(playerId, {
         name: message.author.username,
         points: 0,
         level: 1,
         inventory: {
           rabbits: 0,
           deer: 0,
           berries: 0,
         },
         location: 'forest',
         energy: 100,
         wins: 0,
         losses: 0,
       });
     }

     const player = players.get(playerId);
     const location = player.location;

     if (!locations.includes(location)) {
       message.channel.send('Invalid location.');
       return;
     }

     // Check if the player has enough energy to hunt.
     if (player.energy < 10) {
       message.channel.send('You are too tired to hunt. Rest and regain energy with `!rest`.');
       return;
     }

     // Simulate hunting based on the player's location.
     const huntingResults = simulateHunting(location);

     // Update the player's inventory based on hunting results.
     for (const item of Object.keys(huntingResults)) {
       player.inventory[item] += huntingResults[item];
     }

     // Consume energy for hunting.
     player.energy -= 10;

     // Check for a hunting challenge.
     if (Math.random() < 0.2) {
       const challengeWon = simulateHuntingChallenge(player);
       if (challengeWon) {
         player.wins++;
         player.points += rewards.challengeWin.points; // Reward for winning a challenge.
         message.channel.send('You won the hunting challenge against the bot!');
       } else {
         player.losses++;
         message.channel.send('You lost the hunting challenge against the bot.');
       }
     }

     // Check if the player leveled up.
     const previousLevel = player.level;
     player.level = calculateLevel(player.points);
     if (player.level > previousLevel) {
       player.points += rewards.levelUp.points; // Reward for leveling up.
       player.energy += rewards.levelUp.energy; // Restore energy when leveling up.
       message.channel.send(
         `${player.name} leveled up to level ${player.level}! You earned ${rewards.levelUp.points} points and restored ${rewards.levelUp.energy} energy.`
       );
     }

     // Send a message with the hunting results, player's inventory, and win-loss record.
     message.channel.send(
       `${player.name} went hunting in the ${location} during ${getCurrentCycle()}. ${huntingResults.message}. Your inventory: ${formatInventory(
         player.inventory
       )}\nEnergy: ${player.energy}\nWins: ${player.wins}, Losses: ${player.losses}`
     );
   } else if (message.content.startsWith(`${prefix}explore`)) {
     const playerId = message.author.id;
     if (!players.has(playerId)) {
       message.channel.send('You are not a registered player. Use `!hunt` to start your adventure!');
     } else {
       const player = players.get(playerId);
       const location = getRandomLocation();
       player.location = location;

       message.channel.send(`${player.name} is now exploring the ${location}.`);
     }
   } else if (message.content.startsWith(`${prefix}rest`)) {
     const playerId = message.author.id;
     if (!players.has(playerId)) {
       message.channel.send('You are not a registered player. Use `!hunt` to start your adventure!');
     } else {
       const player = players.get(playerId);
       player.energy += 20; // Resting restores 20 energy.
       if (player.energy > 100) {
         player.energy = 100; // Limit energy to a maximum of 100.
       }
       message.channel.send(`${player.name} rested and regained energy. Energy: ${player.energy}`);
     }
   } else if (message.content.startsWith(`${prefix}stats`)) {
     const playerId = message.author.id;
     if (!players.has(playerId)) {
       message.channel.send('You are not a registered player. Use `!hunt` to start your adventure!');
     } else {
       const player = players.get(playerId);
       message.channel.send(
         `${player.name}'s Stats:\nLevel: ${player.level}, \nInventory: ${formatInventory(
           player.inventory
         )}, Location: ${player.location}\nEnergy: ${player.energy}\nWins: ${player.wins}, Losses: ${player.losses}`
       );
     }
   }

   //Donations
   if (message.content.startsWith(`${prefix}patreon`)) {
       message.channel.send('Support us on Patreon and get exclusive rewards: [Patreon Link]');
    } else if (message.content.startsWith(`${prefix}kofi`)) {
       message.channel.send('Buy us a coffee on Ko-fi and show your support: [Ko-fi Link]');
    } else if (message.content.startsWith(`${prefix}paypal`)) {
       message.channel.send('Donate via PayPal to help us continue developing the bot: [PayPal Link]');
    }

   //Votings
   if (message.content.startsWith(`${prefix}vote`)) {
       message.channel.send('Help support our bot by voting for it on top.gg: [Your top.gg bot page URL]');
   }

 });

 // Simulate hunting based on location.
 function simulateHunting(location) {
   const possibleEvents = locationEvents[location];
   const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];

   const huntingResults = {
     message: event,
   };

   // Update inventory based on the event.
   switch (event) {
     case 'found a rabbit':
       huntingResults.rabbits = 1;
       break;
     case 'found a deer':
       huntingResults.deer = 1;
       break;
     case 'found some berries':
       huntingResults.berries = 5;
       break;
     case 'encountered a wolf':
       // Wolves can steal some inventory items.
       for (const item of Object.keys(huntingResults)) {
         if (huntingResults[item] > 0) {
           huntingResults[item] -= Math.floor(Math.random() * 3); // Randomly subtract 0 to 2 items.
           if (huntingResults[item] < 0) {
             huntingResults[item] = 0;
           }
         }
       }
       break;
     // Add more events as needed.
   }

   return huntingResults;
 }

 // Simulate a hunting challenge with the bot.
 function simulateHuntingChallenge(player) {
   // The player wins if their energy is above 50 and the bot's energy is below 50.
   return player.energy > 50 && Math.random() < 0.5;
 }

 // Calculate player level based on points.
 function calculateLevel(points) {
   return Math.floor(points / 100) + 1; // Level up every 100 points.
 }

 // Get a random location.
 function getRandomLocation() {
   return locations[Math.floor(Math.random() * locations.length)];
 }

 // Format the player's inventory for display.
 function formatInventory(inventory) {
   const items = [];
   for (const item of Object.keys(inventory)) {
     if (inventory[item] > 0) {
       items.push(`${item}: ${inventory[item]}`);
     }
   }
   return items.join(', ') || 'Empty';
 }

 // Start the day-night cycle timer.
 function startDayNightCycle() {
   setInterval(() => {
     currentCycle = 1 - currentCycle; // Switch between day (0) and night (1).
   }, 60000); // Cycle every minute (adjust as needed).
 }

 // Get the current cycle (day or night).
 function getCurrentCycle() {
   return dayNightCycle[currentCycle];
 }


// Log in to Discord with your bot's token
//client.login(config.token);
client.login(process.env.DISCORD_TOKEN);
