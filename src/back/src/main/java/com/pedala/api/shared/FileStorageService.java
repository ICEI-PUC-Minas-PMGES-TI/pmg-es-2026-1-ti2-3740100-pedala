package com.pedala.api.shared;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

@Slf4j
@Service
public class FileStorageService {

    private final Path uploadDir;
    private final List<String> allowedTypes;

    public FileStorageService(
            @Value("${app.upload.dir}") String uploadDir,
            @Value("${app.upload.allowed-types}") String allowedTypes) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.allowedTypes = List.of(allowedTypes.split(","));
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Nao foi possivel criar diretorio de uploads: " + this.uploadDir, e);
        }
    }

    public String store(MultipartFile file, String prefix) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw new IllegalArgumentException("Formato de imagem invalido. Use JPG, PNG ou WebP.");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = ".jpg";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        }

        String filename = prefix + "_" + System.currentTimeMillis() + ext;

        try {
            Path targetPath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Arquivo salvo: {}", targetPath);
            return "/uploads/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Erro ao salvar arquivo: " + e.getMessage(), e);
        }
    }

    public void delete(String filePath) {
        if (filePath == null || !filePath.startsWith("/uploads/")) return;
        String filename = filePath.substring("/uploads/".length());
        try {
            Path path = uploadDir.resolve(filename);
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Nao foi possivel deletar arquivo: {}", filePath);
        }
    }
}
