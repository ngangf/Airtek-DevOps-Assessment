import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";

const vpcCidrBlock = "10.0.0.0/16";
const publicSubnetCidrBlock1 = "10.0.0.0/24";
const privateSubnetCidrBlock1 = "10.0.1.0/24";
const privateSubnetCidrBlock2 = "10.0.2.0/24";
const publicSubnetCidrBlock2 = "10.0.3.0/24";

// Create the VPC
const vpc = new aws.ec2.Vpc("myVpc", {
    cidrBlock: vpcCidrBlock,
    tags: {
        Name: "myVpc",
        Environment: "Production",
    },
});

// Create the public subnet in us-east-1a
const publicSubnet1 = new aws.ec2.Subnet("publicSubnet1", {
    cidrBlock: publicSubnetCidrBlock1,
    vpcId: vpc.id,
    availabilityZone: "us-east-1a",
    tags: {
        Name: "Public Subnet 1",
        Environment: "Production",
    },
});

// Create the private subnet in us-east-1a
const privateSubnet1 = new aws.ec2.Subnet("privateSubnet1", {
    cidrBlock: privateSubnetCidrBlock1,
    vpcId: vpc.id,
    availabilityZone: "us-east-1a",
    tags: {
        Name: "Private Subnet 1",
        Environment: "Production",
    },
});

// Create the public subnet in us-east-1b
const publicSubnet2 = new aws.ec2.Subnet("publicSubnet2", {
    cidrBlock: publicSubnetCidrBlock2,
    vpcId: vpc.id,
    availabilityZone: "us-east-1b",
    tags: {
        Name: "Public Subnet 2",
        Environment: "Production",
    },
});

// Create the private subnet in us-east-1b
const privateSubnet2 = new aws.ec2.Subnet("privateSubnet2", {
    cidrBlock: privateSubnetCidrBlock2,
    vpcId: vpc.id,
    availabilityZone: "us-east-1b",
    tags: {
        Name: "Private Subnet 2",
        Environment: "Production",
    },
});

// Create the Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("internetGateway", {
    vpcId: vpc.id,
    tags: {
        Name: "internetGateway",
        Environment: "Production",
    },
});

// Create the public route table and associate with public subnets
const publicRouteTable = new aws.ec2.RouteTable("publicRouteTable", {
    vpcId: vpc.id,
    routes: [{
        cidrBlock: "0.0.0.0/0",
        gatewayId: internetGateway.id,
    }],
    tags: {
        Name: "publicRouteTable",
        Environment: "Production",
    },
});

const publicSubnet1Association = new aws.ec2.RouteTableAssociation("publicSubnet1Association", {
    routeTableId: publicRouteTable.id,
    subnetId: publicSubnet1.id,
});

const publicSubnet2Association = new aws.ec2.RouteTableAssociation("publicSubnet2Association", {
    routeTableId: publicRouteTable.id,
    subnetId: publicSubnet2.id,
});

// Create the Elastic IP
const elasticIp = new aws.ec2.Eip("natGatewayEip", {
    tags: {
        Name: "natGatewayEIP",
        Environment: "Production",
    },
});

// Create the NAT Gateway and associate with the Elastic IP
const natGateway = new aws.ec2.NatGateway("natGateway", {
    subnetId: publicSubnet1.id,
    allocationId: elasticIp.id,
    tags: {
        Name: "natGateway",
        Environment: "Production",
    },
});

// Create the private route table and associate with private subnets
const privateRouteTable = new aws.ec2.RouteTable("privateRouteTable", {
    vpcId: vpc.id,
    routes: [{
        cidrBlock: "0.0.0.0/0",
        gatewayId: natGateway.id,
    }],
    tags: {
        Name: "privateRouteTable",
        Environment: "Production",
    },
});

const privateSubnet1Association = new aws.ec2.RouteTableAssociation("privateSubnet1Association", {
    routeTableId: privateRouteTable.id,
    subnetId: privateSubnet1.id,
});

const privateSubnet2Association = new aws.ec2.RouteTableAssociation("privateSubnet2Association", {
    routeTableId: privateRouteTable.id,
    subnetId: privateSubnet2.id,
});

// Create an IAM role for the EKS cluster
const eksRole = new aws.iam.Role("eksRole", {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: {
                Service: "eks.amazonaws.com",
            },
            Action: "sts:AssumeRole",
        }],
    },
});

// Attach the required policies to the EKS role
const eksClusterPolicyArns = [
    aws.iam.ManagedPolicy.AmazonEKSClusterPolicy,
    aws.iam.ManagedPolicy.AmazonEKSServicePolicy,
];

for (const policyArn of eksClusterPolicyArns) {
    const eksRolePolicyAttachment = new aws.iam.RolePolicyAttachment(`eksRolePolicy-${policyArn}`, {
        policyArn: policyArn,
        role: eksRole.name,
    });
}

// Create the EKS cluster
const eksCluster = new aws.eks.Cluster("eksCluster", {
    name: "eksDemo",
    vpcConfig: {
        subnetIds: [privateSubnet1.id, privateSubnet2.id],
    },
    roleArn: eksRole.arn,
});

// Create an IAM role for the EKS node group
const nodeGroupRole = new aws.iam.Role("eksNodeGroupRole", {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: {
                Service: "ec2.amazonaws.com",
            },
            Action: "sts:AssumeRole",
        }],
    },
});

// Attach the required policies to the EKS node group role
const eksNodeGroupPolicyArns = [
    aws.iam.ManagedPolicy.AmazonEC2ContainerRegistryReadOnly,
    aws.iam.ManagedPolicy.AmazonEKSWorkerNodePolicy,
    aws.iam.ManagedPolicy.AmazonEKS_CNI_Policy,
];

for (const policyArn of eksNodeGroupPolicyArns) {
    const nodeGroupRolePolicyAttachment = new aws.iam.RolePolicyAttachment(`eksNodeGroupRolePolicy-${policyArn}`, {
        policyArn: policyArn,
        role: nodeGroupRole.name,
    });
}

// Create the EKS node group
const nodeGroup = new aws.eks.NodeGroup("eksNodeGroup", {
    clusterName: eksCluster.name,
    nodeGroupName: "NodeGroupDemo",
    nodeRoleArn: nodeGroupRole.arn,
    subnetIds: [privateSubnet1.id, privateSubnet2.id],
    instanceTypes: ["t2.micro"], 
    scalingConfig: {
        desiredSize: 3, 
        maxSize: 5, 
        minSize: 3, 
    },
});

// Export the VPC and subnet IDs for convenience
export const vpcId = vpc.id;
export const publicSubnetId1 = publicSubnet1.id;
export const privateSubnetId1 = privateSubnet1.id;
export const publicSubnetId2 = publicSubnet2.id;
export const privateSubnetId2 = privateSubnet2.id;

// Export the EKS cluster details for convenience
export const eksClusterName = eksCluster.name;
export const eksClusterEndpoint = eksCluster.endpoint;
export const eksClusterArn = eksCluster.arn;

// Export the EKS node group details for convenience
export const eksNodeGroupName = nodeGroup.nodeGroupName;
export const eksNodeGroupArn = nodeGroup.arn;
