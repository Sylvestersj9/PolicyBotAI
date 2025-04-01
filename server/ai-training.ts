import { HfInference } from '@huggingface/inference';
import { Policy, AiTraining, InsertAiTraining } from '@shared/schema';
import { storage } from './storage';

// Initialize the Hugging Face client with API key
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Models that support fine-tuning
const TRAINABLE_MODELS = {
  // For text classification and policy categorization
  'classification': 'distilbert-base-uncased',
  // For semantic understanding and search 
  'semantic': 'sentence-transformers/all-MiniLM-L6-v2',
  // For detailed policy analysis 
  'analysis': 'distilroberta-base',
  // For question answering about policies
  'qa': 'distilbert-base-uncased-distilled-squad'
};

// Default training parameters for different model types
const DEFAULT_TRAINING_PARAMS = {
  'classification': {
    epochs: 3,
    batchSize: 16,
    learningRate: 2e-5,
    weightDecay: 0.01
  },
  'semantic': {
    epochs: 4,
    batchSize: 32,
    learningRate: 3e-5,
    margin: 0.2
  },
  'analysis': {
    epochs: 5,
    batchSize: 8,
    learningRate: 5e-5,
    seqLength: 512
  },
  'qa': {
    epochs: 3,
    batchSize: 12,
    learningRate: 3e-5,
    maxQueryLength: 64,
    maxSeqLength: 384
  }
};

/**
 * Prepare policy documents for training
 * @param policies Array of policies to use for training
 * @param modelType Type of model being trained
 */
async function prepareTrainingData(policies: Policy[], modelType: string) {
  console.log(`Preparing training data for ${modelType} model with ${policies.length} policies`);
  
  // Common preprocessing for all document types
  const cleanPolicies = policies.map(policy => {
    // Basic text cleaning
    let content = policy.content || '';
    content = content
      .replace(/\r\n/g, '\n')  // Normalize line breaks
      .replace(/\n+/g, '\n')   // Remove multiple line breaks
      .replace(/\t/g, ' ')     // Replace tabs with spaces
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();                 // Remove leading/trailing whitespace
      
    return {
      ...policy,
      content,
      // Extract sections by splitting on common section headers
      sections: content
        .split(/\n(?:SECTION|ARTICLE|CHAPTER|PART)\s+\d+[.:]\s+/i)
        .filter(section => section.trim().length > 0)
    };
  });
  
  // Format data according to model type
  let trainingData;
  
  switch (modelType) {
    case 'classification':
      // Format for text classification - use categories as labels
      trainingData = cleanPolicies.map(policy => ({
        text: policy.content.substring(0, 512), // Limit length
        label: policy.categoryId.toString()
      }));
      break;
      
    case 'semantic':
      // Format for semantic search - create positive and negative pairs
      trainingData = [];
      for (let i = 0; i < cleanPolicies.length; i++) {
        // Use policy title and content as positive pair
        trainingData.push({
          text1: cleanPolicies[i].title,
          text2: cleanPolicies[i].content.substring(0, 256),
          label: 1 // positive pair
        });
        
        // Create negative pair with randomly selected different policy
        if (cleanPolicies.length > 1) {
          let j = i;
          while (j === i) {
            j = Math.floor(Math.random() * cleanPolicies.length);
          }
          trainingData.push({
            text1: cleanPolicies[i].title,
            text2: cleanPolicies[j].content.substring(0, 256),
            label: 0 // negative pair
          });
        }
      }
      break;
      
    case 'analysis':
      // Format for policy analysis - extract key points and sections
      trainingData = [];
      for (const policy of cleanPolicies) {
        // Use sections as separate training examples
        policy.sections.forEach((section, index) => {
          if (section.length > 30) { // Only use substantive sections
            trainingData.push({
              policy_id: policy.id,
              section_id: index,
              text: section.substring(0, 512),
              metadata: {
                policy_title: policy.title,
                category_id: policy.categoryId
              }
            });
          }
        });
      }
      break;
      
    case 'qa':
      // Format for question answering - extract potential questions and answers
      trainingData = [];
      
      for (const policy of cleanPolicies) {
        // Generate QA pairs from policy content
        // This is a simplified approach - in a real system we might use more
        // sophisticated methods to generate realistic questions
        
        // Split into paragraphs
        const paragraphs = policy.content.split(/\n\n+/);
        
        for (const paragraph of paragraphs) {
          if (paragraph.length < 50) continue; // Skip short paragraphs
          
          // Find sentences that contain potential answers (keywords, numbers, dates)
          const sentences = paragraph.split(/[.!?]+\s+/);
          
          for (const sentence of sentences) {
            if (sentence.length < 20) continue; // Skip short sentences
            
            // Check if sentence contains relevant information
            if (/\b(must|should|required|prohibited|allowed|date|within|percent|\d+ days)\b/i.test(sentence)) {
              // Create a question from this sentence (simplified approach)
              const question = generateQuestion(sentence, policy.title);
              
              if (question) {
                trainingData.push({
                  policy_id: policy.id,
                  question: question,
                  context: paragraph,
                  answer: sentence
                });
              }
            }
          }
        }
      }
      break;
      
    default:
      throw new Error(`Unsupported model type: ${modelType}`);
  }
  
  return trainingData;
}

/**
 * Generate a question from a policy sentence (simplified approach)
 */
function generateQuestion(sentence: string, policyTitle: string): string | null {
  // Simple rule-based question generation
  if (sentence.length < 10) return null;
  
  sentence = sentence.trim();
  
  // Remove leading articles and conjunctions
  sentence = sentence.replace(/^(a|an|the|but|and|or|if|when|while)\s+/i, '');
  
  // Different question patterns based on sentence content
  if (/\b(must|should|required|shall)\b/i.test(sentence)) {
    return `What is required regarding ${getTopicFromSentence(sentence, policyTitle)}?`;
  }
  
  if (/\b(cannot|prohibited|not allowed|forbidden)\b/i.test(sentence)) {
    return `What is prohibited regarding ${getTopicFromSentence(sentence, policyTitle)}?`;
  }
  
  if (/\b(may|can|allowed|permitted)\b/i.test(sentence)) {
    return `What is permitted regarding ${getTopicFromSentence(sentence, policyTitle)}?`;
  }
  
  if (/\b(\d+|one|two|three|four|five)\s+(day|week|month|year)s?\b/i.test(sentence)) {
    return `What is the timeframe for ${getTopicFromSentence(sentence, policyTitle)}?`;
  }
  
  if (/\b(procedure|process|step|guideline)\b/i.test(sentence)) {
    return `What is the procedure for ${getTopicFromSentence(sentence, policyTitle)}?`;
  }
  
  // Default question format
  return `What does the policy state about ${getTopicFromSentence(sentence, policyTitle)}?`;
}

/**
 * Extract the main topic from a sentence
 */
function getTopicFromSentence(sentence: string, policyTitle: string): string {
  // First, try to extract the subject of the sentence (simplified approach)
  const words = sentence.split(/\s+/);
  
  // Look for nouns after initial verbs or modals
  let startIndex = 0;
  for (let i = 0; i < Math.min(3, words.length); i++) {
    if (/\b(is|are|was|were|be|been|being|must|should|can|may|will|shall)\b/i.test(words[i])) {
      startIndex = i + 1;
      break;
    }
  }
  
  // Extract 3-5 words after the identified starting point
  const endIndex = Math.min(startIndex + 5, words.length);
  const topic = words.slice(startIndex, endIndex).join(' ');
  
  // If we couldn't extract a good topic, use part of the policy title
  if (topic.length < 5) {
    const titleWords = policyTitle.split(/\s+/);
    return titleWords.slice(0, Math.min(3, titleWords.length)).join(' ');
  }
  
  return topic;
}

/**
 * Simulate actual model training with progress updates
 * In a real implementation, this would use Hugging Face's training APIs
 */
async function simulateModelTraining(
  trainingId: number,
  modelType: string,
  trainingData: any[],
  params: any
): Promise<{
  success: boolean;
  metrics?: any;
  errorMessage?: string;
}> {
  try {
    console.log(`Starting training for model type: ${modelType}`);
    console.log(`Training parameters:`, params);
    console.log(`Training data size: ${trainingData.length} examples`);
    
    // In a real implementation, we would:
    // 1. Format the data for the specific model
    // 2. Upload the data to Hugging Face or another training service
    // 3. Call the appropriate API to start training
    // 4. Monitor the training progress
    
    // But for this demo, we'll simulate the process
    const totalSteps = params.epochs * Math.ceil(trainingData.length / params.batchSize);
    let currentStep = 0;
    
    // Simulate the training process with progress updates
    for (let epoch = 0; epoch < params.epochs; epoch++) {
      console.log(`Starting epoch ${epoch + 1}/${params.epochs}`);
      
      // Update status to in_progress after first epoch begins
      if (epoch === 0) {
        await storage.updateAiTrainingStatus(
          trainingId,
          "in_progress",
          undefined,
          undefined,
          undefined,
          5 // 5% progress
        );
      }
      
      // Process batches
      for (let batchStart = 0; batchStart < trainingData.length; batchStart += params.batchSize) {
        // Simulate batch processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        currentStep++;
        
        // Calculate and update progress every few steps
        if (currentStep % 5 === 0 || currentStep === totalSteps) {
          const progress = Math.floor((currentStep / totalSteps) * 100);
          
          // Generate some realistic looking metrics
          const metrics = {
            epoch: epoch + 1,
            step: currentStep,
            loss: 0.5 * Math.pow(0.95, epoch) + (Math.random() * 0.1),
            accuracy: 0.6 + (0.1 * epoch) + (Math.random() * 0.05)
          };
          
          // Update training status with progress
          await storage.updateAiTrainingStatus(
            trainingId,
            "in_progress",
            undefined,
            metrics,
            undefined,
            progress
          );
          
          console.log(`Training progress: ${progress}%, metrics:`, metrics);
        }
      }
    }
    
    // Generate final metrics
    const finalMetrics = {
      totalExamples: trainingData.length,
      epochs: params.epochs,
      finalLoss: 0.2 + (Math.random() * 0.1),
      finalAccuracy: 0.8 + (Math.random() * 0.15),
      trainingTime: params.epochs * trainingData.length / params.batchSize * 0.1, // Simulated time in seconds
      modelSize: Math.floor(Math.random() * 200) + 300, // Simulated model size in MB
      timestamp: new Date().toISOString()
    };
    
    console.log(`Training completed with metrics:`, finalMetrics);
    
    return {
      success: true,
      metrics: finalMetrics
    };
    
  } catch (error) {
    console.error("Error during model training:", error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Start the AI training process
 */
export async function startAiTraining(trainingRecord: AiTraining): Promise<void> {
  try {
    const { id, model: modelType, trainingParams, policies: policyIds } = trainingRecord;
    
    // First, update status to show we're beginning the process
    await storage.updateAiTrainingStatus(
      id,
      "in_progress",
      undefined,
      { status: "Initializing training process" },
      undefined,
      1 // 1% progress
    );
    
    // Get the actual policy records from the database
    const policyPromises = policyIds.map(policyId => 
      storage.getPolicy(parseInt(policyId, 10))
    );
    
    const policyResults = await Promise.all(policyPromises);
    const validPolicies = policyResults.filter(p => p !== undefined) as Policy[];
    
    // Update status to show we're preparing data
    await storage.updateAiTrainingStatus(
      id,
      "in_progress",
      undefined,
      { status: "Preparing training data" },
      undefined,
      2 // 2% progress
    );
    
    // Verify we have enough policies for training
    if (validPolicies.length < 3) {
      throw new Error("Not enough valid policies for training. Need at least 3 policies.");
    }
    
    // Prepare the training data
    const trainingData = await prepareTrainingData(validPolicies, modelType);
    
    // Use provided training params or fall back to defaults
    const params = trainingParams || DEFAULT_TRAINING_PARAMS[modelType as keyof typeof DEFAULT_TRAINING_PARAMS];
    
    // Update status to show data preparation is complete
    await storage.updateAiTrainingStatus(
      id,
      "in_progress",
      undefined,
      { 
        status: "Training data prepared",
        examples: trainingData.length,
        modelType 
      },
      undefined,
      3 // 3% progress
    );
    
    // Simulate actual model training
    const result = await simulateModelTraining(id, modelType, trainingData, params);
    
    if (result.success) {
      // Update status to completed with metrics
      await storage.updateAiTrainingStatus(
        id,
        "completed",
        new Date(),
        result.metrics,
        undefined,
        100 // 100% progress
      );
      
      console.log(`Training ${id} completed successfully`);
    } else {
      // Update status to failed with error message
      await storage.updateAiTrainingStatus(
        id,
        "failed",
        new Date(),
        undefined,
        result.errorMessage,
        undefined
      );
      
      console.error(`Training ${id} failed:`, result.errorMessage);
    }
    
  } catch (error) {
    console.error(`Error in AI training process for training ${trainingRecord.id}:`, error);
    
    // Update status to failed with error message
    await storage.updateAiTrainingStatus(
      trainingRecord.id,
      "failed",
      new Date(),
      undefined,
      error instanceof Error ? error.message : String(error),
      undefined
    );
  }
}

/**
 * Activate a specific training model to be used for AI operations
 */
export async function activateTrainingModel(trainingId: number): Promise<boolean> {
  try {
    // Get the training record
    const training = await storage.getAiTraining(trainingId);
    if (!training) {
      throw new Error(`Training with ID ${trainingId} not found`);
    }
    
    // Verify that the training is completed
    if (training.status !== "completed") {
      throw new Error(`Cannot activate training ${trainingId} because it is not completed (status: ${training.status})`);
    }
    
    // Deactivate all other models of the same type
    const allTrainings = await storage.getAiTrainings();
    const activeTrainings = allTrainings.filter(t => 
      t.model === training.model && t.isActive && t.id !== trainingId
    );
    
    for (const activeTraining of activeTrainings) {
      await storage.updateAiTrainingIsActive(activeTraining.id, false);
    }
    
    // Activate the selected training
    await storage.updateAiTrainingIsActive(trainingId, true);
    
    console.log(`Activated training model ${trainingId} for ${training.model}`);
    return true;
    
  } catch (error) {
    console.error(`Error activating training model ${trainingId}:`, error);
    return false;
  }
}