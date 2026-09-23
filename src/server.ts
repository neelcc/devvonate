import { app } from "./app.js";
import { Config } from "./config/index.js";
import logger from "./config/logger.js";
import { sqsConsumer } from "./infrastructure/sqs/sqs.consumer.js";


const startServer = async () => {
    const PORT = Config.PORT;
    try {
        // logger.info("Database Connected Successfully!");
        const server = app.listen(PORT, () => {
            logger.info("Server is running on port " + PORT);
        });
        sqsConsumer.start(); // Start the SQS consumer when the server starts
        // Graceful shutdown
          const shutdown = async () => {
               logger.info('Shutting down gracefully...');

               server.close(async () => {
                    logger.info('Server closed');
                    process.exit(0);
               });
          };
          
          process.on('SIGTERM', shutdown);
          process.on('SIGINT', shutdown);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

startServer().catch((error) => {
    logger.error("Failed to start server", error);
    process.exit(1);
});
