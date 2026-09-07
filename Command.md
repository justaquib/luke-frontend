# Angular CLI Commands

This document lists the Angular CLI commands available for the `ag_frontend` project (Angular CLI v21.2.23).

## Development

```bash
ng serve
```

Starts the local development server at `http://localhost:4200/`. The app auto-reloads on file changes.

### Serve options

```bash
ng serve --open          # Open browser automatically
ng serve --port 4300     # Use a custom port
ng serve --host 0.0.0.0  # Expose to network
ng serve --configuration production
```

## Code scaffolding

Generate new project artifacts with `ng generate` (alias: `ng g`).

```bash
ng generate component <name>
ng generate directive <name>
ng generate pipe <name>
ng generate service <name>
ng generate class <name>
ng generate interface <name>
ng generate enum <name>
ng generate guard <name>
ng generate interceptor <name>
ng generate resolver <name>
ng generate module <name>
ng generate library <name>
ng generate application <name>
ng generate environment <name>
```

### Common flags

```bash
ng generate component <name> --skip-tests
ng generate component <name> --inline-style
ng generate component <name> --inline-template
ng generate component <name> --standalone
ng generate component <name> --change-detection OnPush
ng generate service <name> --provided-in root
```

List all available schematics:

```bash
ng generate --help
```

## Building

```bash
ng build
```

Compiles the project and outputs artifacts to the `dist/` directory.

### Common flags

```bash
ng build --configuration production
ng build --configuration development
ng build --watch
ng build --base-href /my-app/
ng build --output-path dist/custom
```

List available build configurations:

```bash
ng build --help
```

## Testing

### Unit tests (Vitest)

```bash
ng test
```

Run once without watch mode:

```bash
ng test --watch=false
```

Run a specific test file:

```bash
ng test --include='**/my-component.spec.ts'
```

### End-to-end tests

```bash
ng e2e
```

Angular CLI does not include an e2e framework by default; install one (e.g. Cypress, Playwright) before running.

## Linting and formatting

```bash
ng lint
ng format
```

## Project information

```bash
ng version          # Print Angular CLI and framework versions
ng help             # List all available commands
ng analytics info   # Show analytics configuration
```

## Updating

```bash
ng update                  # Check for available updates
ng update @angular/core     # Update Angular core packages
ng update @angular/cli      # Update the Angular CLI itself
```

## Additional Resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)




-----------------------------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------------------------------------------------------------------------





# Docker Commands

The `ag_frontend` project includes a multi-stage `Dockerfile` (based on `node:22.19.0-alpine`) that exposes the app on port `4242`. Run these commands from the `ag_frontend/` directory.

## Building the image

```bash
docker build -t ag_frontend .
```

Build with a custom tag and build-arg:

```bash
docker build -t ag_frontend:1.0.0 .
docker build -t ag_frontend --build-arg NODE_VERSION=22.19.0 .
```

Build without using the cache (clean rebuild):

```bash
docker build --no-cache -t ag_frontend .
```

## Running the container

```bash
docker run --rm -d --name ag_frontend -p 4242:4242 ag_frontend
```

Run with an interactive shell instead of starting the app:

```bash
docker run --rm -it --entrypoint sh ag_frontend
```

Pass environment variables to the container:

```bash
docker run --rm -d --name ag_frontend -p 4242:4242 \
  -e NODE_ENV=production \
  ag_frontend
```

Mount a local volume (useful for development):

```bash
docker run --rm -d --name ag_frontend \
  -p 4242:4242 \
  -v $(pwd):/usr/src/app \
  ag_frontend
```

## Managing containers and images

```bash
docker ps                  # List running containers
docker ps -a               # List all containers (including stopped)
docker stop ag_frontend    # Stop the running container
docker start ag_frontend   # Start a stopped container
docker restart ag_frontend # Restart the container
docker rm ag_frontend      # Remove the container
docker rm -f ag_frontend   # Force-remove a running container

docker images              # List images
docker rmi ag_frontend     # Remove the image
docker image prune -a      # Remove all unused images
```

## Inspecting logs and processes

```bash
docker logs ag_frontend            # Show container logs
docker logs -f ag_frontend         # Follow log output (live tail)
docker logs --tail 100 ag_frontend # Show last 100 log lines

docker exec -it ag_frontend sh     # Open a shell inside the container
docker top ag_frontend             # List running processes in the container
docker inspect ag_frontend         # Full container details as JSON
docker stats                       # Live resource-usage stats
```

## Docker Compose (optional)

If you add a `docker-compose.yml`, common commands become:

```bash
docker compose up -d            # Build (if needed) and start services
docker compose down             # Stop and remove containers, networks
docker compose down --volumes   # Also remove volumes
docker compose logs -f          # Tail logs from all services
docker compose ps               # List service status
docker compose build            # Build or rebuild services
docker compose restart          # Restart services
```

## Cleaning up

```bash
docker container prune          # Remove all stopped containers
docker volume prune             # Remove all unused volumes
docker network prune            # Remove all unused networks
docker system prune             # Remove all stopped containers, networks, dangling images, and build cache
docker system prune -a --volumes  # Aggressive cleanup (removes all unused images too)
```

## Additional Resources

- [Docker CLI reference](https://docs.docker.com/engine/reference/runline/)
- [Dockerfile reference](https://docs.docker.com/engine/reference/builder/)