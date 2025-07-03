import { Message, MessageResponse } from '@common/types/messages';

interface QueuedMessage {
  message: Message;
  sender: chrome.runtime.MessageSender;
  sendResponse: (response?: MessageResponse) => void;
  timestamp: number;
}

interface MessageHandler {
  (message: Message, sender: chrome.runtime.MessageSender): Promise<MessageResponse | null>;
}

export class MessageQueueService {
  private messageQueue: QueuedMessage[] = [];
  private isProcessing = false;
  private handlers: Map<string, MessageHandler> = new Map();
  private processingTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly MESSAGE_TIMEOUT = 5000; // 5 seconds
  
  constructor() {
    console.log('[MessageQueue] Service initialized');
  }
  
  /**
   * Register a handler for specific message types
   */
  public registerHandler(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
    console.log(`[MessageQueue] Registered handler for ${type}`);
  }
  
  /**
   * Queue a message for processing
   */
  public async queueMessage(
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: MessageResponse) => void
  ): Promise<boolean> {
    // Check queue size limit
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('[MessageQueue] Queue full, rejecting message');
      sendResponse({
        success: false,
        error: 'Message queue full'
      });
      return true;
    }
    
    // Add to queue
    this.messageQueue.push({
      message,
      sender,
      sendResponse,
      timestamp: Date.now()
    });
    
    console.log(`[MessageQueue] Queued message type: ${message.type}, queue size: ${this.messageQueue.length}`);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    // Return true to indicate async response
    return true;
  }
  
  /**
   * Process messages in the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const queuedMessage = this.messageQueue.shift();
      if (!queuedMessage) continue;
      
      // Check if message has timed out
      if (Date.now() - queuedMessage.timestamp > this.MESSAGE_TIMEOUT) {
        console.warn(`[MessageQueue] Message timed out: ${queuedMessage.message.type}`);
        queuedMessage.sendResponse({
          success: false,
          error: 'Message processing timeout'
        });
        continue;
      }
      
      try {
        // Process the message
        await this.processMessage(queuedMessage);
      } catch (error) {
        console.error('[MessageQueue] Error processing message:', error);
        queuedMessage.sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Process a single message
   */
  private async processMessage(queuedMessage: QueuedMessage): Promise<void> {
    const { message, sender, sendResponse } = queuedMessage;
    
    console.log(`[MessageQueue] Processing message type: ${message.type}`);
    
    // Get handler for message type
    const handler = this.handlers.get(message.type);
    
    if (!handler) {
      console.warn(`[MessageQueue] No handler for message type: ${message.type}`);
      sendResponse({
        success: false,
        error: `No handler for message type: ${message.type}`
      });
      return;
    }
    
    // Set processing timeout
    let timeoutCleared = false;
    this.processingTimeout = setTimeout(() => {
      if (!timeoutCleared) {
        console.error(`[MessageQueue] Handler timeout for message type: ${message.type}`);
        sendResponse({
          success: false,
          error: 'Handler processing timeout'
        });
      }
    }, this.MESSAGE_TIMEOUT);
    
    try {
      // Process message with handler
      const response = await handler(message, sender);
      
      // Clear timeout
      timeoutCleared = true;
      if (this.processingTimeout) {
        clearTimeout(this.processingTimeout);
        this.processingTimeout = null;
      }
      
      // Send response
      if (response) {
        sendResponse(response);
      } else {
        sendResponse({ success: true });
      }
      
      console.log(`[MessageQueue] Successfully processed message type: ${message.type}`);
    } catch (error) {
      // Clear timeout
      timeoutCleared = true;
      if (this.processingTimeout) {
        clearTimeout(this.processingTimeout);
        this.processingTimeout = null;
      }
      
      console.error(`[MessageQueue] Handler error for message type: ${message.type}`, error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Handler error'
      });
    }
  }
  
  /**
   * Clear the message queue
   */
  public clearQueue(): void {
    // Send error responses to all queued messages
    while (this.messageQueue.length > 0) {
      const queuedMessage = this.messageQueue.shift();
      if (queuedMessage) {
        queuedMessage.sendResponse({
          success: false,
          error: 'Queue cleared'
        });
      }
    }
    
    this.isProcessing = false;
    
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    
    console.log('[MessageQueue] Queue cleared');
  }
  
  /**
   * Get queue statistics
   */
  public getStats(): { queueSize: number; isProcessing: boolean; handlerCount: number } {
    return {
      queueSize: this.messageQueue.length,
      isProcessing: this.isProcessing,
      handlerCount: this.handlers.size
    };
  }
  
  /**
   * Cleanup service
   */
  public cleanup(): void {
    this.clearQueue();
    this.handlers.clear();
    console.log('[MessageQueue] Service cleaned up');
  }
}