package com.daggerheart.hub;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the Vite dev server (a different origin, localhost:5173) to call
 * the API (localhost:8787). Without this, every fetch() from the React app
 * fails as a generic "Failed to fetch" with no HTTP status at all — the
 * browser blocks it before the request is even sent.
 *
 * This lives at the root package rather than inside any one module, since
 * it's cross-cutting infrastructure, not something owned by gameset,
 * heroclass, etc.
 *
 * NOTE: this allows only the dev server origin. Once Electron loads the
 * packaged app (not the Vite dev server), its origin will be different
 * (likely file:// or a custom scheme) — this will need revisiting at that
 * point, not before.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    }
}
