import MatrixMath from "./MatrixMath";
import { Platform } from "react-native";

const rotateX = (deg) => {
  const rad = (Math.PI / 180) * deg;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [1, 0, 0, 0, 0, cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1];
};

const rotateY = (deg) => {
  const rad = (Math.PI / 180) * deg;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

return [cos, 0, sin, 0, 0, 1, 0, 0, -sin, 0, cos, 0, 0, 0, 0, 1];
// For IOS 3D Effect and for android just plan effect animation 
// if (Platform.OS === "android") {
//   return [cos, 0, sin, 0, 
//     0, 1, 0, 0, 
//     -sin, 0, cos, 0,
//      0, 0, 0, 1];
// }{
//   return [cos, sin * 0.5, sin, 0, 
//     0, 1, 0, 0, 
//     -sin, 0, cos, 0,
//      0, 0, 0, 1];
// }
 
};

const transformOrigin = (matrix, origin) => {
  const { x, y, z } = origin;

  const translate = MatrixMath.createIdentityMatrix();
  MatrixMath.reuseTranslate3dCommand(translate, x, y, z);
  MatrixMath.multiplyInto(matrix, translate, matrix);

  const untranslate = MatrixMath.createIdentityMatrix();
  MatrixMath.reuseTranslate3dCommand(untranslate, -x, -y, -z);
  MatrixMath.multiplyInto(matrix, matrix, untranslate);
};

export { rotateX, rotateY, transformOrigin };
