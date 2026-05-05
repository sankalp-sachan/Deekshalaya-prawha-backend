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
