import { ListPartsCommand } from "@aws-sdk/client-s3";
import { Config } from "../../config";
import { s3Client } from "../../config/s3";

console.log("Deleting multiple objects from bucket learning-s3-bucket-neel:");

async function  listParts(key: string, uploadId: string) {
        const params = {
            Bucket: Config.aws.bucketName,
            Key: key,
            UploadId: uploadId,
            MaxParts: 1000,
        }

        const command = new ListPartsCommand(params);
        const response = await s3Client.send(command);
        console.log("ListParts response:", response);
        return response;
    }


    listParts("a09a893a-2ac5-493d-8d5c-67de6d9e9bf8/FirsT__1790317384442", "YyC_RC5lNwQuesCY8XFnCNDBbFIxcVeI4SaJ88APE1lhnGvBj87X5drxiaxwmxRpp2rvrvN.cEqCuz.Vm_ij_RVSjmXSF57vrhh4Xw7qH12K85ol99KVcH3w5zdvv4PN")