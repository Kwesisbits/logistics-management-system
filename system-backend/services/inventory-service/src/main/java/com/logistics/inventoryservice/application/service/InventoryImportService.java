package com.logistics.inventoryservice.application.service;

import com.logistics.inventoryservice.application.dto.response.InventoryImportResult;
import com.logistics.inventoryservice.infrastructure.persistence.entity.ProductEntity;
import com.logistics.inventoryservice.infrastructure.persistence.entity.StockLevelEntity;
import com.logistics.inventoryservice.infrastructure.persistence.repository.ProductJpaRepository;
import com.logistics.inventoryservice.infrastructure.persistence.repository.StockLevelJpaRepository;
import com.logistics.inventoryservice.infrastructure.security.InventoryTenant;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryImportService {

    private final ProductJpaRepository productRepository;
    private final StockLevelJpaRepository stockLevelRepository;

    private static final DataFormatter XLS_FORMATTER = new DataFormatter();

    @Transactional
    public InventoryImportResult importFile(MultipartFile file, String format) throws Exception {
        UUID companyId = InventoryTenant.currentCompanyId();
        String lower = format == null ? "csv" : format.toLowerCase(Locale.ROOT);
        List<Map<String, String>> rows = switch (lower) {
            case "xlsx", "excel" -> parseExcel(file);
            default -> parseCsv(file);
        };

        List<String> errors = new ArrayList<>();
        int productsUpserted = 0;
        int stockLevelsUpdated = 0;
        int processed = 0;

        for (int i = 0; i < rows.size(); i++) {
            Map<String, String> row = rows.get(i);
            int line = i + 2;
            try {
                String sku = required(row, "sku");
                String name = required(row, "name");
                String category = required(row, "category");
                String uom = required(row, "unit_of_measure");
                BigDecimal unitCost = new BigDecimal(required(row, "unit_cost"));
                int reorder = Integer.parseInt(required(row, "reorder_threshold"));
                int qty = Integer.parseInt(required(row, "quantity_on_hand"));
                UUID locationId = UUID.fromString(required(row, "location_id"));

                ProductEntity product = productRepository.findByCompanyIdAndSku(companyId, sku).orElseGet(ProductEntity::new);
                product.setCompanyId(companyId);
                product.setSku(sku);
                product.setName(name);
                String desc = row.get("description");
                product.setDescription(desc != null && !desc.isBlank() ? desc : null);
                product.setCategory(category);
                product.setUnitOfMeasure(uom);
                product.setUnitCost(unitCost);
                product.setReorderThreshold(reorder);
                product.setActive(true);
                ProductEntity savedProduct = productRepository.save(product);
                productsUpserted++;
                final UUID productId = savedProduct.getProductId();

                StockLevelEntity level = stockLevelRepository
                    .findByProductIdAndLocationId(productId, locationId)
                    .orElseGet(() -> {
                        StockLevelEntity s = new StockLevelEntity();
                        s.setProductId(productId);
                        s.setLocationId(locationId);
                        s.setQuantityOnHand(0);
                        s.setQuantityReserved(0);
                        return s;
                    });
                if (qty < level.getQuantityReserved()) {
                    throw new IllegalArgumentException(
                        "quantity_on_hand cannot be below reserved quantity (" + level.getQuantityReserved() + ")");
                }
                level.setQuantityOnHand(qty);
                stockLevelRepository.save(level);
                stockLevelsUpdated++;
                processed++;
            } catch (Exception ex) {
                errors.add("Line " + line + ": " + ex.getMessage());
            }
        }

        return new InventoryImportResult(processed, productsUpserted, stockLevelsUpdated, errors);
    }

    private static String required(Map<String, String> row, String key) {
        String v = row.get(key);
        if (v == null || v.isBlank()) {
            throw new IllegalArgumentException("Missing column: " + key);
        }
        return v.trim();
    }

    private List<Map<String, String>> parseCsv(MultipartFile file) throws Exception {
        try (CSVParser parser = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreHeaderCase(true)
            .setTrim(true)
            .build()
            .parse(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            List<Map<String, String>> out = new ArrayList<>();
            for (CSVRecord rec : parser) {
                Map<String, String> m = new HashMap<>();
                for (String h : parser.getHeaderNames()) {
                    m.put(normalizeHeader(h), rec.get(h));
                }
                out.add(m);
            }
            return out;
        }
    }

    private List<Map<String, String>> parseExcel(MultipartFile file) throws Exception {
        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return List.of();
            }
            List<String> headers = new ArrayList<>();
            for (int c = 0; c < headerRow.getLastCellNum(); c++) {
                Cell cell = headerRow.getCell(c);
                headers.add(normalizeHeader(XLS_FORMATTER.formatCellValue(cell)));
            }
            List<Map<String, String>> out = new ArrayList<>();
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }
                Map<String, String> m = new HashMap<>();
                for (int c = 0; c < headers.size(); c++) {
                    String h = headers.get(c);
                    if (h == null || h.isBlank()) {
                        continue;
                    }
                    Cell cell = row.getCell(c);
                    m.put(h, cell == null ? "" : XLS_FORMATTER.formatCellValue(cell).trim());
                }
                out.add(m);
            }
            return out;
        }
    }

    private static String normalizeHeader(String h) {
        if (h == null) {
            return "";
        }
        return h.trim().toLowerCase(Locale.ROOT).replace(' ', '_');
    }
}
