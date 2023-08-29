# Airtek-DevOps-Assessment
Deploying a .net core application composed of a Web UI and a Web API to AWS using Kubernetes

# How to run
The application is available on https://airtek.foribenngang.click

# Tools used for the deployment
- Pulumi TypeScript as the Infrastructure-as-code (Iac) Tool
- Docker Hub
- Helm Charts
- Amazon resources such as:
    * Elastic Kubernetes Sevice (EKS)
    * AWS Certificate Manager (ACM)
    * Elastic Load Balancer (ELB)
    * Virtual Private Cloud (VPC)
    * Elastic Compute Cloud (EC2)
    * Internet Gateway (IGW)
    * NAT GAteway
    * Elastic IP
    * Auto Scaling Groups
    * Route 53
    * IAM Roles
    * Route Tables

# EKS cluster cmds to run:

aws eks list-clusters
aws eks update-kubeconfig --name eksDemo --region us-east-1
kubectl get nodes

kubectl apply -f cluster-namespaces.yaml
kubectl apply -f infraapi-deployment.yaml
kubectl apply -f infraapi-service.yaml
kubectl apply -f infraweb-deployment.yaml
kubectl apply -f infraweb-service.yaml 

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx -n nginx-ingress

*** Go to Route 53 on AWS and create an A Record under the Hosted Zone using the nginx load balancer. For example, airtek.foribenngang.click ***

helm repo add jetstack https://charts.jetstack.io
helm repo update
helm search repo jetstack

*** Record the <desired_version> of jetstack/cert-manager to be used in the command below e.g v1.12.3 ***

helm install cert-manager jetstack/cert-manager --namespace cert-manager --version v1.12.3
kubectl get pods --namespace cert-manager

*** If the installation fails ***
helm upgrade cert-manager jetstack/cert-manager --namespace cert-manager --version v1.12.3

kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.12.3/cert-manager.crds.yaml

kubectl apply -f letsencrypt-cluster-issuer.yaml
kubectl get clusterissuer

kubectl apply -f infraweb-ingress.yaml