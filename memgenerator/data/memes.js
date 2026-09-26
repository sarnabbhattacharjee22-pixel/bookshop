/* ==========================================================================
   MemeForge | data/memes.js
   Local Database of Meme Templates and Stickers
   ========================================================================== */

// We attach this to the global window object since we are using plain script tags
// without a module bundler, keeping the architecture zero-cost and browser-native.

window.MemeData = {
    // Core categories for filtering
    categories: [
        { id: 'all', name: 'All' },
        { id: 'popular', name: 'Popular' },
        { id: 'reaction', name: 'Reaction' },
        { id: 'programming', name: 'Programming' },
        { id: 'animals', name: 'Animals' },
        { id: 'gaming', name: 'Gaming' }
    ],

    // Template library utilizing widely available static public URLs
    // Using i.imgflip.com for reliable, high-quality, free-to-access templates
    templates: [
        {
            id: 'drake-hotline',
            name: 'Drake Hotline Bling',
            url: 'https://i.imgflip.com/30b1gx.jpg',
            width: 1200,
            height: 1200,
            categories: ['popular', 'reaction']
        },
        {
            id: 'distracted-boyfriend',
            name: 'Distracted Boyfriend',
            url: 'https://i.imgflip.com/1ur9b0.jpg',
            width: 1200,
            height: 800,
            categories: ['popular', 'relationship']
        },
        {
            id: 'two-buttons',
            name: 'Two Buttons',
            url: 'https://i.imgflip.com/1g8my4.jpg',
            width: 600,
            height: 908,
            categories: ['popular', 'gaming', 'programming']
        },
        {
            id: 'change-my-mind',
            name: 'Change My Mind',
            url: 'https://i.imgflip.com/24y43o.jpg',
            width: 482,
            height: 361,
            categories: ['popular', 'internet']
        },
        {
            id: 'epic-handshake',
            name: 'Epic Handshake',
            url: 'https://i.imgflip.com/28j0te.jpg',
            width: 900,
            height: 645,
            categories: ['popular', 'reaction']
        },
        {
            id: 'woman-yelling-at-cat',
            name: 'Woman Yelling At Cat',
            url: 'https://i.imgflip.com/345v97.jpg',
            width: 680,
            height: 438,
            categories: ['popular', 'animals', 'reaction']
        },
        {
            id: 'boardroom-meeting',
            name: 'Boardroom Meeting Suggestion',
            url: 'https://i.imgflip.com/m78d.jpg',
            width: 500,
            height: 649,
            categories: ['popular', 'work', 'programming']
        },
        {
            id: 'roll-safe',
            name: 'Roll Safe Think About It',
            url: 'https://i.imgflip.com/1h7in3.jpg',
            width: 702,
            height: 395,
            categories: ['popular', 'reaction', 'programming']
        },
        {
            id: 'left-exit',
            name: 'Left Exit 12 Off Ramp',
            url: 'https://i.imgflip.com/22bdq6.jpg',
            width: 804,
            height: 767,
            categories: ['popular', 'everyday life']
        },
        {
            id: 'success-kid',
            name: 'Success Kid',
            url: 'https://i.imgflip.com/1bhk.jpg',
            width: 500,
            height: 500,
            categories: ['reaction', 'gaming', 'school']
        },
        {
            id: 'disaster-girl',
            name: 'Disaster Girl',
            url: 'https://i.imgflip.com/23ls.jpg',
            width: 500,
            height: 375,
            categories: ['reaction', 'everyday life']
        },
        {
            id: 'batman-slapping-robin',
            name: 'Batman Slapping Robin',
            url: 'https://i.imgflip.com/9ehk.jpg',
            width: 400,
            height: 387,
            categories: ['reaction', 'movies']
        },
        {
            id: 'mocking-spongebob',
            name: 'Mocking Spongebob',
            url: 'https://i.imgflip.com/1otk96.jpg',
            width: 502,
            height: 353,
            categories: ['reaction', 'internet', 'movies']
        },
        {
            id: 'is-this-a-pigeon',
            name: 'Is This a Pigeon',
            url: 'https://i.imgflip.com/1oV0.jpg',
            width: 1500,
            height: 1500,
            categories: ['reaction', 'school', 'programming']
        },
        {
            id: 'always-has-been',
            name: 'Always Has Been',
            url: 'https://i.imgflip.com/46e43q.jpg',
            width: 960,
            height: 540,
            categories: ['popular', 'movies', 'technology']
        },
        {
            id: 'expanding-brain',
            name: 'Expanding Brain',
            url: 'https://i.imgflip.com/1jwhww.jpg',
            width: 857,
            height: 1202,
            categories: ['popular', 'programming', 'internet']
        },
        {
            id: 'hide-the-pain-harold',
            name: 'Hide the Pain Harold',
            url: 'https://i.imgflip.com/gk5el.jpg',
            width: 480,
            height: 601,
            categories: ['reaction', 'work', 'programming']
        },
        {
            id: 'blank-nut-button',
            name: 'Blank Nut Button',
            url: 'https://i.imgflip.com/1yxkcp.jpg',
            width: 600,
            height: 446,
            categories: ['reaction', 'gaming']
        },
        {
            id: 'sad-pablo-escobar',
            name: 'Sad Pablo Escobar',
            url: 'https://i.imgflip.com/1c1uej.jpg',
            width: 720,
            height: 709,
            categories: ['reaction', 'everyday life']
        },
        {
            id: 'surprised-pikachu',
            name: 'Surprised Pikachu',
            url: 'https://i.imgflip.com/2kbn1e.jpg',
            width: 1893,
            height: 1893,
            categories: ['gaming', 'reaction', 'programming']
        },
        {
            id: 'this-is-fine',
            name: 'This Is Fine',
            url: 'https://i.imgflip.com/wxica.jpg',
            width: 580,
            height: 281,
            categories: ['reaction', 'work', 'programming']
        },
        {
            id: 'monkey-puppet',
            name: 'Monkey Puppet',
            url: 'https://i.imgflip.com/2gnnjh.jpg',
            width: 923,
            height: 768,
            categories: ['reaction', 'animals']
        },
        {
            id: 'uno-draw-25',
            name: 'UNO Draw 25 Cards',
            url: 'https://i.imgflip.com/3lmzyx.jpg',
            width: 500,
            height: 494,
            categories: ['gaming', 'popular']
        },
        {
            id: 'bernie-financial-support',
            name: 'I Am Once Again Asking For Your Financial Support',
            url: 'https://i.imgflip.com/3oevdk.jpg',
            width: 750,
            height: 417,
            categories: ['reaction', 'internet']
        }
    ],

    // Local sticker database (Emojis and symbols using native text characters or simple shapes, 
    // converted to paths/images by canvas later, or just simple data objects)
    stickers: [
        // Emojis category
        { id: 'emoji-laugh', char: '😂', category: 'emojis' },
        { id: 'emoji-skull', char: '💀', category: 'emojis' },
        { id: 'emoji-fire', char: '🔥', category: 'emojis' },
        { id: 'emoji-100', char: '💯', category: 'emojis' },
        { id: 'emoji-clown', char: '🤡', category: 'emojis' },
        { id: 'emoji-cry', char: '😭', category: 'emojis' },
        { id: 'emoji-sunglasses', char: '😎', category: 'emojis' },
        { id: 'emoji-eyes', char: '👀', category: 'emojis' },
        { id: 'emoji-heart', char: '❤️', category: 'emojis' },
        { id: 'emoji-thinking', char: '🤔', category: 'emojis' },
        { id: 'emoji-sweat', char: '😅', category: 'emojis' },
        { id: 'emoji-rocket', char: '🚀', category: 'emojis' },

        // Props / Internet (We use text-based visual representation since we have no asset folder)
        { id: 'prop-arrow-red', char: '➡️', category: 'props' },
        { id: 'prop-check', char: '✅', category: 'props' },
        { id: 'prop-x', char: '❌', category: 'props' },
        { id: 'prop-alert', char: '⚠️', category: 'props' },
        { id: 'prop-sparkles', char: '✨', category: 'props' },
        { id: 'prop-star', char: '⭐', category: 'props' },
        { id: 'prop-crown', char: '👑', category: 'props' },
        { id: 'prop-money', char: '💸', category: 'props' },

        // Rage Faces (Text emoticons as placeholders for old-school feel)
        { id: 'rage-lenny', char: '( ͡° ͜ʖ ͡°)', category: 'rage' },
        { id: 'rage-shrug', char: '¯\\_(ツ)_/¯', category: 'rage' },
        { id: 'rage-tableflip', char: '(╯°□°）╯︵ ┻━┻', category: 'rage' },
        { id: 'rage-look', char: 'ಠ_ಠ', category: 'rage' },
        { id: 'rage-fight', char: '(ง\'̀-\'́)ง', category: 'rage' },
        { id: 'rage-yay', char: '\\( ﾟヮﾟ)/', category: 'rage' }
    ]
};