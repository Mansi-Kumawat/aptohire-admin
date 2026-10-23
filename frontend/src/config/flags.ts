const envMode = import.meta.env.VITE_APP_ENV;
const demoValue = import.meta.env.VITE_DEMO_MODE;
export const isProductionBuild = envMode === 'production';
export const demoFeaturesEnabled = demoValue === 'true' || (demoValue === undefined && !import.meta.env.PROD);
const mocksValue = import.meta.env.VITE_USE_MOCKS;
export const mocksEnabled = mocksValue === 'true' || (mocksValue === undefined && !import.meta.env.PROD);
