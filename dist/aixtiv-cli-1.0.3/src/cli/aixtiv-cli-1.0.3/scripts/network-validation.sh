#!/bin/bash
# Comprehensive Network Validation Script

set -e

# Validate Kubernetes Cluster Connectivity
echo "🔍 Validating Cluster Connectivity..."
kubectl cluster-info
kubectl get nodes

# Check Network Policies
echo "🛡️ Verifying Network Policies..."
kubectl get networkpolicies -A

# Test Internal DNS Resolution
echo "🌐 Checking DNS Resolution..."
kubectl run -it --rm --restart=Never dns-test --image=busybox -- nslookup kubernetes.default.svc.cluster.local

# Validate Service Discovery
echo "🔗 Checking Service Discovery..."
kubectl get services --all-namespaces

# Connectivity Test Across Namespaces
echo "🚦 Testing Cross-Namespace Communication..."
kubectl create namespace test-network-1
kubectl create namespace test-network-2
kubectl run nginx --image=nginx -n test-network-1
kubectl run busybox --image=busybox -n test-network-2 --restart=Never -- wget -O- http://nginx.test-network-1.svc.cluster.local

# Cleanup Test Namespaces
kubectl delete namespace test-network-1
kubectl delete namespace test-network-2

echo "✅ Network Validation Complete!"