import fp from 'fastify-plugin'
import mysql from 'mysql2/promise'
async function mysqlPlugin(fastify, options) {
    const connection = mysql.createPool({
        host: "localhost",
        user: "root",
        password: "1234",
        database: "expenses",
        waitForConnections: true,
        queueLimit: 0,
        connectionLimit: 10
    })
    console.log(connection);
    fastify.decorate('mysql', connection);
    fastify.addHook('onClose', async (fastifyInstance, done) => {
        await connection.end().then(() => done());
    });
}
export default fp(mysqlPlugin)