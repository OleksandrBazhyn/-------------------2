require('dotenv').config();
const { Client } = require('pg');
const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function runPostgreSQLTest() {
    try {
        await client.connect();

        console.time('PostgreSQL Insert');
        await client.query(
            `INSERT INTO task_change_logs (task_id, changes)
             VALUES (100002, '[{"changeType": "status_update", "previousValue": "In Progress", "newValue": "Completed", "timestamp": "2024-11-11T12:00:00Z", "userId": 3}]'::jsonb)`
        );
        console.timeEnd('PostgreSQL Insert');

        console.time('PostgreSQL Find');
        await client.query(`SELECT * FROM task_change_logs WHERE task_id = 1`);
        console.timeEnd('PostgreSQL Find');
    } finally {
        await client.end();
    }
}

runPostgreSQLTest().catch(console.error);