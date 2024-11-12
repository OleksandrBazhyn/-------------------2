require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function runPostgresTest() {
  try {
    await client.connect();

    await client.query('CREATE INDEX IF NOT EXISTS idx_priority_name ON taskPriorities(priority_name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_type_name ON taskTypes(type_name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_status_name ON taskStatuses(status_name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_task_project_title ON tasks(project_id, title)');

    // Тест 1: Вставка великого обсягу даних у таблиці
    console.time('PostgreSQL Bulk Insert');
    const taskPriorityQuery = 'INSERT INTO taskPriorities (priority_name) VALUES ($1)';
    const taskTypeQuery = 'INSERT INTO taskTypes (type_name) VALUES ($1)';
    const taskStatusQuery = 'INSERT INTO taskStatuses (status_name) VALUES ($1)';

    await client.query(taskPriorityQuery, ['High']);
    await client.query(taskPriorityQuery, ['Medium']);
    await client.query(taskPriorityQuery, ['Low']);

    await client.query(taskTypeQuery, ['Bug']);
    await client.query(taskTypeQuery, ['Feature']);
    await client.query(taskTypeQuery, ['Improvement']);

    await client.query(taskStatusQuery, ['To Do']);
    await client.query(taskStatusQuery, ['In Progress']);
    await client.query(taskStatusQuery, ['Completed']);

    for (let i = 0; i < 1000; i++) {
      await client.query(`
        INSERT INTO tasks (project_id, title, description, status_id, priority_id, type_id, assigned_to) 
        VALUES ($1, $2, $3, (SELECT id FROM taskStatuses WHERE status_name = $4), 
                (SELECT id FROM taskPriorities WHERE priority_name = $5), 
                (SELECT id FROM taskTypes WHERE type_name = $6), 
                $7)`,
        [i, `Task ${i}`, `Description for task ${i}`, 'To Do', 'High', 'Bug', i % 10]
      );
    }
    console.timeEnd('PostgreSQL Bulk Insert');

    // Тест 2: Складний SELECT із об'єднанням та агрегацією
    console.time('PostgreSQL Complex SELECT');
    const result = await client.query(`
      SELECT taskStatuses.status_name, COUNT(tasks.id) AS task_count
      FROM tasks
      JOIN taskStatuses ON tasks.status_id = taskStatuses.id
      GROUP BY taskStatuses.status_name
    `);
    console.timeEnd('PostgreSQL Complex SELECT');
    console.log('Number of results:', result.rows.length);

    // Тест 3: Оновлення даних
    console.time('PostgreSQL Update');
    await client.query(`
      UPDATE tasks SET status_id = (SELECT id FROM taskStatuses WHERE status_name = 'In Progress') 
      WHERE project_id < 500 AND status_id = (SELECT id FROM taskStatuses WHERE status_name = 'To Do')
    `);
    console.timeEnd('PostgreSQL Update');

    // Тест 4: Видалення даних
    console.time('PostgreSQL Delete');
    await client.query(`
      DELETE FROM tasks 
      WHERE project_id >= 500 
      AND status_id = (SELECT id FROM taskStatuses WHERE status_name = 'To Do')
    `);
    console.timeEnd('PostgreSQL Delete');

  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await clearDatabase().catch(console.error);
    await client.end();
  }
}

async function clearDatabase() {
  const clearClient = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await clearClient.connect();

    const queries = [
      'TRUNCATE TABLE tasks CASCADE',
      'TRUNCATE TABLE taskPriorities CASCADE',
      'TRUNCATE TABLE taskTypes CASCADE',
      'TRUNCATE TABLE taskStatuses CASCADE',
    ];

    for (const query of queries) {
      await clearClient.query(query);
    }
    console.log('Database cleared successfully');
  } catch (err) {
    console.error('Error clearing database', err.stack);
  } finally {
    await clearClient.end();
  }
}

runPostgresTest().catch(console.error);
