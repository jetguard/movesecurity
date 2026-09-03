#!/bin/bash
# Publish do movesecurity (produção) - build com tag única, push, rolling
# update via "kubectl set image" (sem reaplicar o YAML inteiro), limpeza de
# imagens antigas no OCIR e de ReplicaSets inativos.
#
# Pré-requisitos: ver deploy-prod.sh (Secrets já criados, OCIR_USERNAME/OCIR_TOKEN).
set -euo pipefail

[ -f .env.ocir-local ] && source .env.ocir-local

: "${OCIR_USERNAME:?defina OCIR_USERNAME antes de rodar}"
: "${OCIR_TOKEN:?defina OCIR_TOKEN antes de rodar}"

REPOSITORY_NAME="movesecurity-prod"
IMAGE_BASE="gru.ocir.io/grs61s2n1sbr/$REPOSITORY_NAME"
COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaawrlzni72ijurchfdcbrujufwvxqov2ctifgrlfugvh3p5ytj64sa"

kubectl config use-context context-producao

TAG=$(date +%Y%m%d%H%M%S)

echo "Construindo a nova imagem Docker..."
docker build -t "$IMAGE_BASE:$TAG" .

echo "Fazendo login no OCIR..."
echo "$OCIR_TOKEN" | docker login -u "$OCIR_USERNAME" --password-stdin gru.ocir.io

echo "Enviando a nova imagem Docker para o repositório..."
docker push "$IMAGE_BASE:$TAG"

echo "Atualizando a imagem no deployment existente..."
kubectl -n movesecurity-prod set image deployment/movesecurity-prod movesecurity-prod="$IMAGE_BASE:$TAG"

echo "Aguardando o rollout terminar..."
kubectl -n movesecurity-prod rollout status deployment/movesecurity-prod

echo "Listando imagens antigas para remoção (mantendo as 3 mais recentes)..."
IMAGES_JSON=$(oci artifacts container image list --compartment-id "$COMPARTMENT_ID" --repository-name "$REPOSITORY_NAME" --all)

IMAGES_TO_DELETE=$(echo "$IMAGES_JSON" | jq -r '
  if (.data | type == "array") then
    .data
    | map(select(.["time-created"] != null))
    | sort_by(.["time-created"]) | reverse | .[3:][] | .id
  else
    empty
  end
')

for IMAGE_ID in $IMAGES_TO_DELETE; do
  echo "Apagando imagem antiga: $IMAGE_ID"
  oci artifacts container image delete --image-id "$IMAGE_ID" --force
done

echo "Removendo ReplicaSets inativos..."
kubectl -n movesecurity-prod get rs -l app=movesecurity-prod -o json \
  | jq -r '.items[] | select(.status.replicas == 0) | .metadata.name' \
  | while read -r rs; do
      echo "Deletando ReplicaSet inativo: $rs"
      kubectl -n movesecurity-prod delete rs "$rs"
    done

echo "Verificando o estado dos recursos após a atualização..."
kubectl -n movesecurity-prod get all
