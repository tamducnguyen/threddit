import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PreprocessorService } from './preprocessor.service';
import { ChunkerService } from './chunker.service';
import { EmbedderService } from './embedder.service';
import { QdrantService } from './qdrant.service';
import { RetrieverService } from './retriever.service';
import { SummarizerService } from './summarizer.service';
import { TopicDetectorService } from './topic-detector.service';
import { RagService } from './rag.service';

@Module({
  imports: [HttpModule.register({ timeout: 30000 })],
  providers: [
    PreprocessorService,
    ChunkerService,
    EmbedderService,
    QdrantService,
    RetrieverService,
    SummarizerService,
    TopicDetectorService,
    RagService,
  ],
  exports: [RagService],
})
export class RagModule {}
