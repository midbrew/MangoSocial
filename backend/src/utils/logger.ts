import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// Standardize log format
const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let metaString = '';
    if (Object.keys(metadata).length > 0) {
        metaString = JSON.stringify(metadata);
    }
    return `${timestamp} [${level}]: ${message} ${metaString}`;
});

// Create the logger
export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        timestamp({ format: 'HH:mm:ss' }),
        myFormat
    ),
    transports: [
        // Write all logs with level `error` and below to `error.log`
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // Write all logs with level `info` and below to `combined.log`
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

// If we're not in production then log to the `console` with colors
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize(),
            timestamp({ format: 'HH:mm:ss' }),
            myFormat
        )
    }));
}

// Stream for Morgan integration
export const stream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
};
