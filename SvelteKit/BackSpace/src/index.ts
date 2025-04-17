import { createLogger, logShutdown, logCriticalError } from './lib/utils/logger.js';
import { contentManager } from './lib/content/ContentManager.js';

const logger = createLogger('BackSpace');

/**
 * Initialize the application and subsystems
 */
export async function initializeBackSpace(): Promise<void> {
  logger.info('initializeBackSpace', `
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║      🚀 🚀 🚀   BACKSPACE CONTENT SYSTEM STARTING   🚀 🚀 🚀        ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
  
  try {
    logger.info('initializeBackSpace', '🏁🚀 Initializing content manager');
    await contentManager.initialize();
    
    logger.info('initializeBackSpace', '✅🚀 BackSpace system initialized successfully');
    
    // Set up graceful shutdown
    setupShutdownHooks();
  } catch (error) {
    logCriticalError(`Failed to initialize BackSpace: ${error.message}`, error);
    throw error;
  }
}

/**
 * Set up process hooks to handle graceful shutdown
 */
function setupShutdownHooks(): void {
  const shutdown = async () => {
    logger.info('shutdown', '🏁👋 Initiating graceful shutdown');
    
    try {
      // Perform cleanup tasks here
      
      logShutdown();
      
      // Exit process
      process.exit(0);
    } catch (error) {
      logger.error('shutdown', '❌👋 Error during shutdown', {}, error);
      process.exit(1);
    }
  };
  
  // Set up signal handlers
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logCriticalError('Uncaught exception', error);
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logCriticalError('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)));
    process.exit(1);
  });
} 