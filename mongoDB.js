const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function runMongoDBTest() {
    try {
        await client.connect();
        const db = client.db('testDB');
        
        const taskPriorities = db.collection('taskPriorities');
        const taskTypes = db.collection('taskTypes');
        const taskStatuses = db.collection('taskStatuses');
        const tasks = db.collection('tasks');
        
        await taskPriorities.createIndex({ priority_name: 1 });
        await taskTypes.createIndex({ type_name: 1 });
        await taskStatuses.createIndex({ status_name: 1 });
        await tasks.createIndex({ project_id: 1, title: 1 });

        // Тест 1: Вставка даних у кілька колекцій
        console.time('MongoDB Bulk Insert');
        
        await taskPriorities.insertMany([
            { priority_name: 'High' },
            { priority_name: 'Medium' },
            { priority_name: 'Low' }
        ]);

        await taskTypes.insertMany([
            { type_name: 'Bug' },
            { type_name: 'Feature' },
            { type_name: 'Improvement' }
        ]);

        await taskStatuses.insertMany([
            { status_name: 'To Do' },
            { status_name: 'In Progress' },
            { status_name: 'Completed' }
        ]);

        for (let i = 0; i < 1000; i++) {
            await tasks.insertOne({
                project_id: i,
                title: `Task ${i}`,
                description: `Description for task ${i}`,
                status_id: 1 + (i % 3),
                priority_id: 1 + (i % 3),
                type_id: 1 + (i % 3),
                assigned_to: i % 10
            });
        }

        console.timeEnd('MongoDB Bulk Insert');
        
        // Перевірка документів у колекції tasks
        const tasksSample = await tasks.find().limit(5).toArray();
        console.log('Sample tasks:', tasksSample);

        // Перевірка доступних записів у кожній колекції
        const priorities = await taskPriorities.find().toArray();
        const types = await taskTypes.find().toArray();
        const statuses = await taskStatuses.find().toArray();

        console.log('Available priorities:', priorities);
        console.log('Available types:', types);
        console.log('Available statuses:', statuses);

        // Тест 2: Складний запит Find з агрегуванням
        console.time('MongoDB Complex Find');
        const result = await tasks.aggregate([
            {
                $lookup: {
                    from: 'taskStatuses',
                    localField: 'status_id',
                    foreignField: '_id',
                    as: 'status'
                }
            },
            { 
                $unwind: {
                    path: '$status',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$status.status_name',  // Групуємо за статусом
                    task_count: { $sum: 1 }       // Лічильник кількості задач для кожного статусу
                }
            },
            { 
                $match: {
                    _id: 'To Do'  // Змінили умову фільтрації на конкретний статус
                }
            }
        ]).toArray();

        console.timeEnd('MongoDB Complex Find');
        console.log('Number of results:', result.length);
        console.log('Result:', result);

        // Тест 3: Оновлення даних
        console.time('MongoDB Update');
        await tasks.updateOne(
            { project_id: 500, title: 'Task 500' },
            { $set: { status_id: 2 } }
        );
        console.timeEnd('MongoDB Update');

        // Тест 4: Видалення даних
        console.time('MongoDB Delete');
        await tasks.deleteOne({ project_id: 500, title: 'Task 500' });
        console.timeEnd('MongoDB Delete');

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await clearMongoDB().catch(console.error);
        await client.close();
    }
}

async function clearMongoDB() {
    const db = client.db('testDB');
    
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
        await db.collection(collection.name).deleteMany({});
    }
  
    console.log('MongoDB database cleared successfully');
}

runMongoDBTest().catch(console.error);
