#!/bin/bash
# Deploy do movesecurity (dev) - build da imagem, push pro OCIR, apply no K8s.
#
# Pré-requisitos:
#   - Secrets já criados no namespace movesecurity-dev (ver docker/create-secrets.example.sh)
#   - Variáveis de ambiente OCIR_USERNAME e OCIR_TOKEN exportadas no shell
#     (nunca hardcoded aqui - diferente do padrão usado no moveplanner)
set -euo pipefail

[ -f .env.ocir-local ] && source .env.ocir-local

: "${OCIR_USERNAME:?defina OCIR_USERNAME antes de rodar (ex: export OCIR_USERNAME='grs61s2n1sbr/oracleidentitycloudservice/<usuario>@<dominio>')}"
: "${OCIR_TOKEN:?defina OCIR_TOKEN antes de rodar (auth token gerado no perfil OCI)}"

IMAGE="gru.ocir.io/grs61s2n1sbr/movesecurity-dev:latest"

kubectl config use-context context-dev

echo "Verificando o estado atual dos recursos..."
kubectl -n movesecurity-dev get all

echo "Construindo a nova imagem Docker..."
docker build -t "$IMAGE" . --no-cache

echo "Fazendo login no OCIR..."
echo "$OCIR_TOKEN" | docker login -u "$OCIR_USERNAME" --password-stdin gru.ocir.io

echo "Enviando a nova imagem Docker para o repositório..."
docker push "$IMAGE"

echo "Aplicando o novo recurso no Kubernetes..."
kubectl apply -f movesecurity-dev.yml

echo "Aguardando o rollout..."
kubectl -n movesecurity-dev rollout status deployment/movesecurity-dev

echo "Verificando o estado dos recursos após a aplicação..."
kubectl -n movesecurity-dev get all
