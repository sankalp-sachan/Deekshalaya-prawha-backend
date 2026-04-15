require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/news-portal');

        console.log('Connected to DB');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const users = [
            {
                name: 'Anurag Trivedi',
                email: 'admin@newsportal.com',
                password: hashedPassword,
                role: 'Admin'
            },
            {
                name: 'Anant Trivedi',
                email: 'journalist@newsportal.com',
                password: hashedPassword,
                role: 'Journalist'
            },
            {
                name: 'Regular Reader',
                email: 'user@newsportal.com',
                password: hashedPassword,
                role: 'User'
            }
        ];

        // Delete if they already exist
        await User.deleteMany({ email: { $in: users.map(u => u.email) } });

        await User.insertMany(users);
        console.log('Successfully seeded users! \nAdmin: admin@newsportal.com (password123)\nJournalist: journalist@newsportal.com (password123)\nUser: user@newsportal.com (password123)');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
