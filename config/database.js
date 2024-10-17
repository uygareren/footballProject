const mysql = require('mysql');
const path = require("path");
const fs = require("fs");

const configPath = path.join("./", "MySqlConfig.json");
const MysqlConfigStr = fs.readFileSync(configPath, 'utf-8');

const configMysqlConfig = JSON.parse(MysqlConfigStr);

const connection = mysql.createConnection({
    ...configMysqlConfig,
    multipleStatements: true
});

/**
 * 
 * @param {string} query 
 * @param {any[]} values 
 */
async function mysqlQuery(query, values) {
    return new Promise((resolve, reject) => {
        connection.query(query, values, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result);
        });
    });
}

async function mysqlQueryPagination(query, values, limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
        query += "\nLIMIT " + limit + " OFFSET " + offset;
        connection.query(query, values, (err, result) => {
            if(err)
                reject(err);
            resolve(result);
        });
    });
}

connection.connect(async (err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
});

module.exports = {
    mysqlQuery,
    connection,
    mysqlQueryPagination

};
