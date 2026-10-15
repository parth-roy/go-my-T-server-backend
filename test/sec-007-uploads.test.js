const test = require('node:test');
const assert = require('node:assert/strict');

// Modules under test
const {
  isPrivateUpload,
  extractS3Key,
  s3Service,
  UploadFolder,
} = require('../dist/modules/upload/upload.service');
const { uploadController } = require('../dist/modules/upload/upload.controller');
const { prisma } = require('../dist/shared/db/prisma');

test('SEC-007: isPrivateUpload identifies sensitive documents vs public assets', () => {
  // Public assets
  assert.equal(isPrivateUpload('profile'), false);
  assert.equal(isPrivateUpload('profiles'), false);
  assert.equal(isPrivateUpload('banners'), false);

  // Sensitive private documents (must be true)
  assert.equal(isPrivateUpload('documents'), true);
  assert.equal(isPrivateUpload('identity_docs'), true);
  assert.equal(isPrivateUpload('dl_docs'), true);
  assert.equal(isPrivateUpload('rc_docs'), true);
  assert.equal(isPrivateUpload('fitness_docs'), true);
  assert.equal(isPrivateUpload('permit_docs'), true);
  assert.equal(isPrivateUpload('selfies'), true);
  assert.equal(isPrivateUpload('bookings'), true);
  assert.equal(isPrivateUpload('uploads'), true);
  assert.equal(isPrivateUpload(''), true); // Fail closed on empty/unknown
});

test('SEC-007: extractS3Key extracts pure key from various URL shapes', () => {
  assert.equal(
    extractS3Key('https://gomytruck.sgp1.digitaloceanspaces.com/documents/user1/test-id.jpg'),
    'documents/user1/test-id.jpg'
  );
  assert.equal(
    extractS3Key('/documents/user1/test-id.jpg'),
    'documents/user1/test-id.jpg'
  );
  assert.equal(
    extractS3Key('identity_docs/test-id.jpg'),
    'identity_docs/test-id.jpg'
  );
});

test('SEC-007: resolveViewableUrl passes through public assets directly without signing', async () => {
  const publicUrl = 'https://gomytruck.sgp1.digitaloceanspaces.com/profile/avatar-123.jpg';
  const result = await s3Service.resolveViewableUrl(publicUrl);
  assert.equal(result, publicUrl);
});

test('SEC-007: resolveViewableUrl generates presigned URL for private document', async () => {
  const originalGetSignedUrl = s3Service.getSignedUrl;
  try {
    s3Service.getSignedUrl = async (key) => `https://signed.url/${key}?token=mock_presigned_123`;

    const privateUrl = 'https://gomytruck.sgp1.digitaloceanspaces.com/documents/kyc-aadhaar-123.jpg';
    const result = await s3Service.resolveViewableUrl(privateUrl);

    assert.equal(result, 'https://signed.url/documents/kyc-aadhaar-123.jpg?token=mock_presigned_123');
  } finally {
    s3Service.getSignedUrl = originalGetSignedUrl;
  }
});

test('SEC-007: resolveDocumentsUrls batch resolves document list with fresh signed URLs', async () => {
  const originalGetSignedUrl = s3Service.getSignedUrl;
  try {
    s3Service.getSignedUrl = async (key) => `https://signed.url/${key}?sig=fresh`;

    const rawDocs = [
      { id: 'doc-1', type: 'DL_FRONT', fileUrl: 'https://cdn.gomytruck.com/dl_docs/front.jpg' },
      { id: 'doc-2', type: 'DL_BACK', fileUrl: 'https://cdn.gomytruck.com/dl_docs/back.jpg' },
      { id: 'doc-3', type: 'EMPTY_DOC', fileUrl: null },
    ];

    const resolved = await s3Service.resolveDocumentsUrls(rawDocs);
    assert.equal(resolved[0].fileUrl, 'https://signed.url/dl_docs/front.jpg?sig=fresh');
    assert.equal(resolved[1].fileUrl, 'https://signed.url/dl_docs/back.jpg?sig=fresh');
    assert.equal(resolved[2].fileUrl, null);
  } finally {
    s3Service.getSignedUrl = originalGetSignedUrl;
  }
});

test('SEC-007: getSignedViewUrl denies non-owner from accessing private document', async () => {
  const originalDriverFind = prisma.driverDocument.findFirst;
  const originalWorkerFind = prisma.workerDocument.findFirst;
  const originalTruckFind = prisma.fleetTruckDocument.findFirst;
  const originalStopFind = prisma.bookingStop.findFirst;

  try {
    // No document found belonging to user-attacker
    prisma.driverDocument.findFirst = async () => null;
    prisma.workerDocument.findFirst = async () => null;
    prisma.fleetTruckDocument.findFirst = async () => null;
    prisma.bookingStop.findFirst = async () => null;

    let statusCode = 200;
    let responseBody = null;

    const req = {
      user: { id: 'user-attacker', role: 'DRIVER' },
      query: { key: 'documents/victim-user/aadhaar.jpg' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await uploadController.getSignedViewUrl(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(statusCode, 403);
    assert.match(responseBody.message, /Access denied to this document/i);
  } finally {
    prisma.driverDocument.findFirst = originalDriverFind;
    prisma.workerDocument.findFirst = originalWorkerFind;
    prisma.fleetTruckDocument.findFirst = originalTruckFind;
    prisma.bookingStop.findFirst = originalStopFind;
  }
});

test('SEC-007: getSignedViewUrl allows owner to access private document', async () => {
  const originalGetSignedUrl = s3Service.getSignedUrl;
  const originalFindFirst = prisma.driverDocument.findFirst;
  try {
    s3Service.getSignedUrl = async (key) => `https://signed.url/${key}?token=owner_token`;
    // Mock that document belongs to user-owner
    prisma.driverDocument.findFirst = async () => ({ id: 'doc-1', driverId: 'd-1' });

    let statusCode = 200;
    let responseBody = null;

    const req = {
      user: { id: 'user-owner', role: 'DRIVER' },
      query: { key: 'documents/user-owner/aadhaar.jpg' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await uploadController.getSignedViewUrl(req, res, () => {});

    assert.equal(statusCode, 200);
    assert.equal(responseBody.success, true);
    assert.match(responseBody.data.url, /token=owner_token/);
  } finally {
    s3Service.getSignedUrl = originalGetSignedUrl;
    prisma.driverDocument.findFirst = originalFindFirst;
  }
});

test('SEC-008: deleteFile rejects unauthorized deletion of another users file', async () => {
  const originalDriverFind = prisma.driverDocument.findFirst;
  const originalWorkerFind = prisma.workerDocument.findFirst;
  const originalTruckFind = prisma.fleetTruckDocument.findFirst;
  const originalStopFind = prisma.bookingStop.findFirst;
  const originalUserFind = prisma.user.findFirst;
  const originalDeleteFile = s3Service.deleteFile;

  let storageDeleted = false;

  try {
    prisma.driverDocument.findFirst = async () => null;
    prisma.workerDocument.findFirst = async () => null;
    prisma.fleetTruckDocument.findFirst = async () => null;
    prisma.bookingStop.findFirst = async () => null;
    prisma.user.findFirst = async () => null;
    s3Service.deleteFile = async () => {
      storageDeleted = true;
      return { success: true };
    };

    let statusCode = 200;
    let responseBody = null;

    const req = {
      user: { id: 'user-attacker', role: 'CUSTOMER' },
      params: { key: 'documents/victim-user/sensitive-aadhaar.jpg' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await uploadController.deleteFile(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(statusCode, 403);
    assert.match(responseBody.message, /Access denied: You do not own this file/i);
    assert.equal(storageDeleted, false, 'Storage delete must never be invoked on unauthorized request');
  } finally {
    prisma.driverDocument.findFirst = originalDriverFind;
    prisma.workerDocument.findFirst = originalWorkerFind;
    prisma.fleetTruckDocument.findFirst = originalTruckFind;
    prisma.bookingStop.findFirst = originalStopFind;
    prisma.user.findFirst = originalUserFind;
    s3Service.deleteFile = originalDeleteFile;
  }
});

test('SEC-008: deleteFile rejects deletion of immutable Proof of Delivery (POD) record', async () => {
  const originalStopFind = prisma.bookingStop.findFirst;
  const originalDeleteFile = s3Service.deleteFile;
  let storageDeleted = false;

  try {
    prisma.bookingStop.findFirst = async () => ({ id: 'stop-1', podPhotoUrl: 'bookings/pod_123.jpg' });
    s3Service.deleteFile = async () => {
      storageDeleted = true;
      return { success: true };
    };

    let statusCode = 200;
    let responseBody = null;

    const req = {
      user: { id: 'user-1', role: 'DRIVER' },
      params: { key: 'bookings/pod_123.jpg' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await uploadController.deleteFile(req, res, () => {});

    assert.equal(statusCode, 403);
    assert.match(responseBody.message, /Proof of Delivery records are immutable/i);
    assert.equal(storageDeleted, false, 'POD photos must never be deleted by clients');
  } finally {
    prisma.bookingStop.findFirst = originalStopFind;
    s3Service.deleteFile = originalDeleteFile;
  }
});

test('SEC-008: deleteFile allows ADMIN to delete files from storage', async () => {
  const originalDeleteFile = s3Service.deleteFile;
  let deletedKey = null;

  try {
    s3Service.deleteFile = async (key) => {
      deletedKey = key;
      return { success: true };
    };

    let statusCode = 200;
    let responseBody = null;

    const req = {
      user: { id: 'admin-1', role: 'ADMIN' },
      params: { key: 'documents/some-spam-file.jpg' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await uploadController.deleteFile(req, res, () => {});

    assert.equal(statusCode, 200);
    assert.equal(responseBody.success, true);
    assert.equal(deletedKey, 'documents/some-spam-file.jpg');
  } finally {
    s3Service.deleteFile = originalDeleteFile;
  }
});
