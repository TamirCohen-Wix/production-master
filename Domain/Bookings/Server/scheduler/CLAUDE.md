# Scheduler Repository Context

This is the Wix Bookings scheduler monorepo (Scala, Bazel).

## Services
- **bookings-service** (`com.wixpress.bookings.bookings-service`) — Core booking CRUD, validation, multi-service bookings
- **notifications-server** (`com.wixpress.bookings.notifications-server`) — SMS, email, push notifications via TimeCapsule/Greyhound
- **bookings-reader** (`com.wixpress.bookings.reader.bookings-reader`) — Read-optimized booking queries, rate limiting via LoomPrimeRateLimiter
- **sessions-server** (`com.wixpress.bookings.sessions-server`) — Session/schedule management
- **services-2** (`com.wixpress.bookings.services-2`) — Service catalog (booking types, categories, locations)
- **booking-policies** (`com.wixpress.bookings.booking-policies`) — Cancellation, reschedule, waitlist policies
- **events-3** (`com.wixpress.calendar.events-3`) — Calendar events (appointments, sessions)
- **service-availability** (`com.wixpress.bookings.availability.service-availability`) — Time slot availability

## Artifact ID Patterns
- Standard: `com.wixpress.bookings.<service-name>`
- Calendar: `com.wixpress.calendar.<service-name>`
- Availability: `com.wixpress.bookings.availability.<service-name>`
- Reader: `com.wixpress.bookings.reader.<service-name>`

## Key Patterns
- Feature toggles defined in `BUILD.bazel` (`feature_toggles = [...]`), managed via Wix Dev Portal
- Rate limiting uses `LoomPrimeRateLimiter` with MSID as entity key
- TimeCapsule (scheduled tasks) built on Greyhound (Kafka)
- Retry config in `notifications-server-config.json.erb`: 1, 10, 20, 60, 120, 360 minutes
- gRPC service definitions in proto files under `<service>-api/src/main/proto/`
- SDL (ScalikeJDBC) for database operations

## Common Investigation Patterns
- `bookings-reader` errors may appear as caller entries inside `bookings-service` logs (not a separate artifact in Grafana)
- NULL `meta_site_id` in error logs means crash happened before MSID was set in logging context
- Request IDs contain Unix timestamps: `<unix_timestamp>.<random>` — use for time correlation
