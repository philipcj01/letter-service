import { App } from 'aws-cdk-lib';
import { LetterServiceStack } from './lib/stack';

const app = new App();

new LetterServiceStack(
  app,
  'letters' + ((process.env.STACK_SUFFIX && `-${process.env.STACK_SUFFIX}`) || ''),
  'Letter Generator Service'
);
