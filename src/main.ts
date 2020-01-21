import { NestFactory } from "@nestjs/core";
import { CustomLogger, initializeWinston } from "./common/CustomLogger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions-filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { ValidationPipe } from "./common/pipes/validation.pipe";
import { config, configAsBoolean } from "./common/Config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import * as fastifyRateLimit from "fastify-rate-limit";

async function bootstrap() {
  initializeWinston();
  const logger = new CustomLogger("Application");
  logger.log("****** Starting API ******");

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: false,
    },
  );

  intializeSwagger(app);

  if (config.rateLimit.enabled === true) {
    app.register(fastifyRateLimit, {
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.timeWindow,
    });
  }

  app.enableCors({
    origin: config.cors.origin,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(config.port, "0.0.0.0");
  logger.log(`Started on port ${config.port}`);
}
bootstrap();

function intializeSwagger(app: NestFastifyApplication) {
  if (configAsBoolean(config.swagger.enabled) === false) {
    return;
  }

  const options = new DocumentBuilder()
    .setTitle("NestStarter")
    .setDescription("NestStarter")
    .setContactEmail("mark.kamau@outlook.com")
    .setSchemes(process.env.NODE_ENV === "production" ? "https" : "http")
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(config.swagger.endpoint, app, document);
}
