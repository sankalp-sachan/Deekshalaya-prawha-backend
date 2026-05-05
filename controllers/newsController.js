const News = require('../models/News');
const slugify = require('slugify');

exports.createNews = async (req, res) => {
    try {
        const { title, content, category, tags, images, isBreaking } = req.body;
        // Improved slug generation for multilingual support
        let slug = slugify(title, { lower: true, remove: /[*+~.()'"!:@]/g });
        if (!slug) slug = Date.now().toString(); // Fallback if slugify fails to produce anything
        
        const news = new News({
            title, content, category, tags, images, isBreaking, slug,
            author: req.user.id
        });

        // AI Summary logic using Groom (Native Fetch)
        if (process.env.GROQ_API_KEY) {
            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "mixtral-8x7b-32768",
                        messages: [{
                            role: "user",
                            content: `Summarize this news article in 2 sentences: ${content.substring(0, 500)}`
                        }]
                    })
                });
                const data = await response.json();
                if (data.choices && data.choices[0]) {
                    news.summary = data.choices[0].message.content;
                }
            } catch (err) {
                console.error("AI Summary generation failed", err);
            }
        }

        await news.save();

        if (isBreaking) {
            const io = req.app.get('socketio');
            io.emit('breaking-news', { title, slug });
        }

        res.status(201).json(news);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getNews = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 10 } = req.query;
        let query = {};
        if (category) query.category = category;
        if (search) query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
        ];

        const news = await News.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('author', 'name');

        const count = await News.countDocuments(query);
        res.json({ news, totalPages: Math.ceil(count / limit), currentPage: Number(page) });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getOneNews = async (req, res) => {
    try {
        const news = await News.findOneAndUpdate(
            { slug: req.params.slug },
            { $inc: { views: 1 } },
            { new: true }
        ).populate('author', 'name');
        if (!news) return res.status(404).send('News not found');
        res.json(news);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.updateNews = async (req, res) => {
    try {
        const { title, content, category, tags, images, isBreaking } = req.body;
        // Improved slug generation for multilingual support
        let slug = slugify(title, { lower: true, remove: /[*+~.()'"!:@]/g });
        if (!slug) slug = Date.now().toString(); // Fallback if slugify fails to produce anything
        
        const news = await News.findByIdAndUpdate(req.params.id, 
            { title, content, category, tags, images, isBreaking, slug },
            { new: true }
        );
        res.json(news);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getNewsById = async (req, res) => {
    try {
        const news = await News.findById(req.params.id).populate('author', 'name');
        if (!news) return res.status(404).send('News not found');
        res.json(news);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.deleteNews = async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.json({ msg: 'News deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getTrendingNews = async (req, res) => {
    try {
        const news = await News.find().sort({ views: -1 }).limit(5);
        res.json(news);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.likeNews = async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) return res.status(404).send('News not found');

        const index = news.likes.findIndex(likeId => likeId.toString() === req.user.id);
        if (req.user.id && index === -1) {
            news.likes.push(req.user.id);
        } else if (req.user.id) {
            news.likes.splice(index, 1);
        }
        await news.save();
        res.json(news.likes);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getNewsShare = async (req, res) => {
    try {
        const news = await News.findOne({ slug: req.params.slug });
        if (!news) return res.status(404).send('News not found');

        const backendUrl = process.env.BACKEND_URL || 'https://deekshalaya-prawha-backend.onrender.com';
        const getImageUrl = (img) => {
            if (!img) return 'https://images.unsplash.com/photo-1504711432869-efd597cdd042?auto=format&fit=crop&q=80&w=1600';
            return img.startsWith('http') ? img : `${backendUrl}${img}`;
        };

        const imageUrl = getImageUrl(news.images?.[0]);
        // The URL of your React frontend. 
        // In production, set FRONTEND_URL in your environment variables.
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; 
        const redirectUrl = `${frontendUrl}/news/${news.slug}`;

        res.send(`
            <!DOCTYPE html>
            <html lang="en" prefix="og: http://ogp.me/ns#">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${news.title}</title>
                
                <!-- Core Meta Tags -->
                <meta name="description" content="${news.summary || 'दीक्षालय प्रवाह - बहुभाषी दैनिक समाचार पत्र'}">
                
                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="article">
                <meta property="og:url" content="${redirectUrl}">
                <meta property="og:title" content="${news.title}">
                <meta property="og:description" content="${news.summary || 'दीक्षालय प्रवाह - बहुभाषी दैनिक समाचार पत्र'}">
                <meta property="og:image" content="${imageUrl}">
                <meta property="og:image:secure_url" content="${imageUrl}">
                <meta property="og:image:type" content="image/jpeg">
                <meta property="og:image:width" content="1200">
                <meta property="og:image:height" content="630">
                <meta property="og:site_name" content="दीक्षालय प्रवाह">

                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:url" content="${redirectUrl}">
                <meta property="twitter:title" content="${news.title}">
                <meta property="twitter:description" content="${news.summary || 'दीक्षालय प्रवाह - बहुभाषी दैनिक समाचार पत्र'}">
                <meta property="twitter:image" content="${imageUrl}">

                <!-- Prerender/Scraper optimization -->
                <meta name="robots" content="index, follow">
                
                <meta http-equiv="refresh" content="0;url=${redirectUrl}">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
                <div style="text-align: center; max-width: 400px; padding: 20px;">
                    <div style="margin-bottom: 20px; color: #0284c7;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 2s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                    </div>
                    <h1 style="color: #0f172a; font-size: 1.5rem; margin-bottom: 10px;">Redirecting to News</h1>
                    <p style="color: #64748b; line-height: 1.5;">We are taking you to the article: <br><strong>${news.title}</strong></p>
                    <p style="margin-top: 30px;"><a href="${redirectUrl}" style="color: #fff; background: #0284c7; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">Click here if not redirected</a></p>
                </div>
                <style>
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                </style>
                <script>window.location.href = "${redirectUrl}";</script>
            </body>
            </html>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
