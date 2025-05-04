args = parse_arguments()

    # Create configuration
    config = Config(
        project=args.project,
        location=args.location,
        agent_name=args.agent_name
    )

    # Validate configuration
    if not config.validate():
        logger.error("Invalid configuration")
        sys.exit(1)

    try:
        # Deploy the agent
        logger.info(f"Deploying agent {config.agent_name} to project {config.project} in {config.location}")
        agent = deploy_agent(config)

        # Test the deployment if not skipped
        if not args.skip_test:
            if test_deployment(agent, config):
                logger.info("Deployment test passed")
            else:
                logger.warning("Deployment test failed")

        logger.info(f"Agent deployment completed successfully. Resource name: {agent.resource_name}")
        print(f"\nDeployment Resource Name: {agent.resource_name}")
        print(f"Use this resource name when connecting to your agent.")
        print(f"Example: agent_engine = vertexai.agent_engines.get('{agent.resource_name}')")

        return 0
    except Exception as e:
        logger.error(f"Deployment failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
EOF

chmod +x ./deployment/deploy.py
