const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function runMongoDBTest() {
    try {
        await client.connect();
        const db = client.db('testDB');
        const collection = db.collection('taskChangeLogs');

        console.time('MongoDB Insert');
        await collection.insertOne({
            taskId: 100002,
            changes: [
                {
                    changeType: "status_update",
                    previousValue: "In Progress",
                    newValue: "Completed",
                    timestamp: new Date(),
                    userId: 3
                }
            ]
        });
        console.timeEnd('MongoDB Insert');

        console.time('MongoDB Find');
        await collection.findOne({taskId: 1});
        console.timeEnd('MongoDB Find');
    } finally {
        await client.close();
    }
}

runMongoDBTest().catch(console.error);