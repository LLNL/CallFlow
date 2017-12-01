import dotenv from 'dotenv';
import getenv from 'getenv';
import path from 'path';

// load env file
dotenv.config();

const SERVER_HOST = "localhost";
const SERVER_PORT = 3000;

const Config = {
    host: SERVER_HOST,
    port: SERVER_PORT,
};

const Dir = {
    src: path.resolve(__dirname),
    public: path.resolve(__dirname, '..', 'public'),
    build: path.resolve(__dirname, '..', 'public', 'build'),
    server: path.resolve(__dirname, '..', 'public', 'server'),
};

export { Config, Dir };
