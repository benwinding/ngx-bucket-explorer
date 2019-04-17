import { File } from '../../types/google-cloud-types';
import { Bucket } from '@google-cloud/storage';
import * as request from 'request';
import { GetAllChildrenWithPrefix } from '../../utils/storage-helper';
import {
  RetrieveFilePermissions,
  UpdateFilePermissions,
  blankPermissionsObj
} from '../../utils/permissions-helper';
import {
  PermissionsObject,
  PermisionsRole,
  PermissionEntity,
  UserCustomClaims,
  ResultObj
} from 'ngx-filemanager-core/public_api';

export function SetPermissionToObj(
  permissionsObj: PermissionsObject,
  role: PermisionsRole,
  entity: PermissionEntity
): PermissionsObject {
  const newPermissions = {
    ...blankPermissionsObj(),
    ...permissionsObj
  };
  let list: PermissionEntity[];
  switch (role) {
    case 'OWNER':
      list = newPermissions.owners;
      break;
    case 'WRITER':
      list = newPermissions.writers;
      break;
    case 'READER':
      list = newPermissions.readers;
      break;
    default:
      break;
  }
  const match = list.find(u => u.id === entity.id);
  if (!match) {
    list.push(entity);
  }
  return newPermissions;
}

export async function TryChangeSingleFilePermissions(
  file: File,
  role: PermisionsRole,
  entity: PermissionEntity
) {
  const currentPermissions = await RetrieveFilePermissions(file);
  const newPermissions = SetPermissionToObj(currentPermissions, role, entity);
  const res = await UpdateFilePermissions(file, newPermissions);
  return res;
}

async function tryChangePermissions(
  bucket: Bucket,
  filePath: string,
  role: PermisionsRole,
  entity: PermissionEntity,
  isRecursive: boolean
): Promise<request.Response[]> {
  if (isRecursive) {
    const allChildren = await GetAllChildrenWithPrefix(bucket, filePath);
    const successArray = await Promise.all(
      allChildren.map(file =>
        TryChangeSingleFilePermissions(file, role, entity)
      )
    );
    return successArray;
  } else {
    const file = bucket.file(filePath);
    const result = await TryChangeSingleFilePermissions(file, role, entity);
    return [result];
  }
}

export async function ChangePermissions(
  bucket: Bucket,
  items: string[],
  role: PermisionsRole,
  entity: PermissionEntity,
  isRecursive: boolean,
  claims: UserCustomClaims
): Promise<ResultObj> {
  const successArr = await Promise.all(
    items.map(filePath =>
      tryChangePermissions(bucket, filePath, role, entity, isRecursive)
    )
  );

  // const successArr = successArrArr.reduce((acc, cur) => {
  //   return acc.concat(cur);
  // }, []);
  // const results = getResultFromArray(successArr);
  // return results;
  return {
    success: successArr as any
  };
}
