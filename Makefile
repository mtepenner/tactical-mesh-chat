.PHONY: all test-go test-python build-gateway docker-gateway help

all: test-go test-python

test-go:
	@echo "==> Running Go tests..."
	cd mesh_gateway && go mod tidy && go test ./...

test-python:
	@echo "==> Running Python simulation..."
	python3 simulation/mesh_visualizer.py

build-gateway:
	@echo "==> Building Go gateway..."
	cd mesh_gateway && go build -o bin/gateway ./cmd/hub

docker-gateway:
	@echo "==> Building Docker image for gateway..."
	cd mesh_gateway && docker build -t tactical-mesh-gateway .

help:
	@echo "Targets:"
	@echo "  all            - Run all tests"
	@echo "  test-go        - Run Go unit tests"
	@echo "  test-python    - Run mesh simulation"
	@echo "  build-gateway  - Build Go gateway binary"
	@echo "  docker-gateway - Build gateway Docker image"
