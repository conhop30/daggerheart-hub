package com.daggerheart.hub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Entry point. Each direct sub-package of com.daggerheart.hub (gameset,
 * heroclass, subclass, domain, adversary, environment, equipment, heritage,
 * optionalmechanics) is treated by Spring Modulith as its own module with
 * an enforced boundary — see ModularityTests for the test that verifies
 * that boundary actually holds.
 */
@SpringBootApplication
public class HubApplication {

    public static void main(String[] args) {
        ensureDataDirectoryExists();
        SpringApplication.run(HubApplication.class, args);
    }

    /**
     * The SQLite JDBC driver creates the database file itself if it's
     * missing, but it will NOT create missing parent directories — it
     * just fails to connect instead. This has to run before
     * SpringApplication.run(), since by the time any Spring bean could
     * do this, the datasource has usually already tried (and failed) to
     * connect.
     */
    private static void ensureDataDirectoryExists() {
        Path dataDir = Path.of(System.getProperty("user.home"), ".daggerheart-hub");
        try {
            Files.createDirectories(dataDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create data directory: " + dataDir, e);
        }
    }
}
