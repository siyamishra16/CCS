// Quick Database Connection Test Script
// Run this to verify your PostgreSQL setup
// Usage: node test-db-connection.js

require('dotenv').config();
const pool = require('./db');

console.log('\n🔍 Testing PostgreSQL Connection...\n');
console.log('Configuration:');
// console.log('  Host:', process.env.DB_HOST);
// console.log('  User:', process.env.DB_USER);
// console.log('  Database:', process.env.DB_NAME);
// console.log('  Port:', process.env.DB_PORT);
// console.log('  Port:', process.env.DATABASE_URL);
console.log('\n⏳ Connecting...\n');

// Test 1: Basic connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Connection FAILED!');
        console.error('Error:', err.message);
        console.error('\nCommon solutions:');
        console.error('  1. Make sure PostgreSQL service is running');
        console.error('  2. Check .env file has correct credentials');
        console.error('  3. Verify database "CCS" exists in pgAdmin');
        console.error('  4. Check if port 5432 is correct');
        pool.end();
        process.exit(1);
    }

    console.log('✅ Connection successful!');
    console.log('📅 Database time:', res.rows[0].now);

    // Test 2: Check if tables exist
    pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public' 
        ORDER BY table_name
    `, (err, res) => {
        if (err) {
            console.error('\n❌ Error checking tables:', err.message);
            pool.end();
            process.exit(1);
        }

        console.log('\n📊 Tables found in database:');
        if (res.rows.length === 0) {
            console.log('  ⚠️  No tables found!');
            console.log('  → You need to run schema.sql');
            console.log('  → Open pgAdmin → Query Tool → Open schema.sql → Execute');
        } else {
            res.rows.forEach(row => {
                console.log('  ✓', row.table_name);
            });
        }

        // Test 3: Check user_types data
        pool.query('SELECT COUNT(*) as count FROM user_types', (err, res) => {
            if (err) {
                console.log('\n⚠️  user_types table not found or empty');
                console.log('  → Run schema.sql to create tables and seed data');
            } else {
                console.log('\n👥 User types configured:', res.rows[0].count);
            }

            // Test 4: Check users count
            pool.query('SELECT COUNT(*) as count FROM users', (err, res) => {
                if (err) {
                    console.log('⚠️  users table not accessible');
                } else {
                    console.log('👤 Total users in database:', res.rows[0].count);
                }

                console.log('\n✨ Database is ready to use!\n');
                pool.end();
            });
        });
    });
});
