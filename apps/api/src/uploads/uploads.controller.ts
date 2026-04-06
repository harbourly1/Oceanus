import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiConsumes, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';

const storage = memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only PDF and image files are allowed'), false);
  }
};

@ApiTags('uploads')
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storageService: StorageService) {}

  @Post('document')
  @UseInterceptors(FileInterceptor('file', {
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single document (PDF/Image)' })
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return this.storageService.upload(file, 'documents');
  }

  @Post('documents')
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple documents (PDF/Image, max 10)' })
  async uploadDocuments(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('At least one file is required');
    return Promise.all(files.map(f => this.storageService.upload(f, 'documents')));
  }
}
