import { jest } from '@jest/globals';
import { IDeviceModelRepository, VariableAttribute } from '@citrineos/data';
import { AttributeEnumType } from '@citrineos/base';
import { faker } from '@faker-js/faker';
import { aBasicAuthPasswordVariable } from '../../providers/VariableAttributeProvider';
import { BasicAuthenticationFilter } from '../../../src/networkconnection/authenticator/BasicAuthenticationFilter';
import {
  aRequestWithAuthorization,
  basicAuth,
} from '../../providers/IncomingMessageProvider';
import { anAuthenticationOptions } from '../../providers/AuthenticationOptionsProvider';
import { IncomingMessage } from 'http';
import { AuthenticationOptions } from '@citrineos/base';

type PasswordPair = {
  plaintext: string;
  hash: string;
};

describe('BasicAuthenticationFilter', () => {
  const password: PasswordPair = {
    plaintext: 'SEPtwLckb5QD5on0EXcCAmuQVmJ*bu3ZXmA:Clt3',
    hash: '$2b$10$p2i423u55xbzTZ4yiiRog.QIKEQpg6G3oMtv.FTMfZdST7f9NSC2u',
  };

  const anotherPassword: PasswordPair = {
    plaintext: '_Oec8yF4r1hH6ildo4yvM25:SU2hpL*jobDskYos',
    hash: '$2b$10$rLoAseNoS.CC2tBBfowOFudwh0g8PiJeD1a7Zcw5ux.HREo/qblzC',
  };

  let deviceModelRepository: jest.Mocked<IDeviceModelRepository>;
  let filter: BasicAuthenticationFilter;

  beforeEach(() => {
    deviceModelRepository = {
      readAllByQuerystring: jest.fn(),
    } as unknown as jest.Mocked<IDeviceModelRepository>;

    filter = new BasicAuthenticationFilter(deviceModelRepository);
  });

  afterEach(() => {
    deviceModelRepository.readAllByQuerystring.mockReset();
  });

  describe.each([1, 2])(`given %i security profile `, (securityProfile) => {
    const authenticationOptions = anAuthenticationOptions({
      securityProfile,
      allowUnknownChargingStations: faker.datatype.boolean(),
    });

    it.each([
      [
        '9a06661c-2332-4897-b0d4-2187671dbe7b',
        ' 9a06661c-2332-4897-b0d4-2187671dbe7b',
      ],
      [
        '9a06661c-2332-4897-b0d4-2187671dbe7b',
        '9a06661c-2332-4897-b0d4-2187671dbe7b ',
      ],
      [
        '9a06661c-2332-4897-b0d4-2187671dbe7b',
        '9a06661c-2332-4897-b0d4-2187671dbe7bb',
      ],
      [
        '9a06661c-2332-4897-b0d4-2187671dbe7b',
        '8a06661c-2332-4897-b0d4-2187671dbe7b',
      ],
      [
        '9a06661c-2332-4897-b0d4-2187671dbe7b',
        'bc2696f3-66d5-4027-9eae-be74c1e85fa7',
      ],
    ])(
      'should reject when station identifier does not match username',
      async (stationId, username) => {
        givenPassword(stationId, password.hash);

        await expect(
          filter.authenticate(
            stationId,
            aRequestWithAuthorization(basicAuth(username, password.plaintext)),
            authenticationOptions,
          ),
        ).rejects.toThrow(`Unauthorized ${stationId}`);
        expect(
          deviceModelRepository.readAllByQuerystring,
        ).not.toHaveBeenCalled();
      },
    );

    it('should reject when missing Authorization header', async () => {
      const stationId = faker.string.uuid().toString();

      await expect(
        filter.authenticate(
          stationId,
          aRequestWithAuthorization(undefined),
          authenticationOptions,
        ),
      ).rejects.toThrow('Auth header missing or incorrectly formatted');
      expect(deviceModelRepository.readAllByQuerystring).not.toHaveBeenCalled();
    });

    it('should reject when Authorization header is empty', async () => {
      const stationId = faker.string.uuid().toString();

      await expect(
        filter.authenticate(
          stationId,
          aRequestWithAuthorization(''),
          authenticationOptions,
        ),
      ).rejects.toThrow('Auth header missing or incorrectly formatted');
      expect(deviceModelRepository.readAllByQuerystring).not.toHaveBeenCalled();
    });

    it('should reject when Authorization header is not Basic', async () => {
      const stationId = faker.string.uuid().toString();

      await expect(
        filter.authenticate(
          stationId,
          aRequestWithAuthorization(
            `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6ImNwMDAxIiwiaWF0IjoxNTE2MjM5MDIyfQ.Y3LDdxSufp_2nOqUmBWTR5CyQ2eEBWPPzjRIJqc6bn8`,
          ),
          authenticationOptions,
        ),
      ).rejects.toThrow('Auth header missing or incorrectly formatted');
      expect(deviceModelRepository.readAllByQuerystring).not.toHaveBeenCalled();
    });

    it('should reject when missing username', async () => {
      const stationId = faker.string.uuid().toString();

      await expect(
        filter.authenticate(
          stationId,
          aRequestWithAuthorization(basicAuth('', password.plaintext)),
          authenticationOptions,
        ),
      ).rejects.toThrow('Auth header missing or incorrectly formatted');
      expect(deviceModelRepository.readAllByQuerystring).not.toHaveBeenCalled();
    });

    it('should reject when missing password', async () => {
      const stationId = faker.string.uuid().toString();

      await expect(
        filter.authenticate(
          stationId,
          aRequestWithAuthorization(basicAuth(stationId, '')),
          authenticationOptions,
        ),
      ).rejects.toThrow('Auth header missing or incorrectly formatted');
      expect(deviceModelRepository.readAllByQuerystring).not.toHaveBeenCalled();
    });

    it('should reject when missing username and password', async () => {
      const stationId = faker.string.uuid().toString();

      await expect(
        filter.authenticate(
          stationId,
          aRequestWithAuthorization(basicAuth('', '')),
          authenticationOptions,
        ),
      ).rejects.toThrow('Auth header missing or incorrectly formatted');
      expect(deviceModelRepository.readAllByQuerystring).not.toHaveBeenCalled();
    });

    it('should reject when password is not found for station', async () => {
      const stationId = faker.string.uuid().toString();
      givenNoPassword();

      await expect(
        filter.authenticate(
          stationId,
          aRequestWithAuthorization(basicAuth(stationId, password.plaintext)),
          authenticationOptions,
        ),
      ).rejects.toThrow(`Unauthorized ${stationId}`);
      expect(deviceModelRepository.readAllByQuerystring).toHaveBeenCalledWith({
        stationId: stationId,
        component_name: 'SecurityCtrlr',
        variable_name: 'BasicAuthPassword',
        type: AttributeEnumType.Actual,
      });
    });

    it.each([
      {
        actualPassword: password.hash,
        authenticationPassword: ` `,
      },
      {
        actualPassword: password.hash,
        authenticationPassword: anotherPassword.plaintext,
      },
      {
        actualPassword: anotherPassword.hash,
        authenticationPassword: password.plaintext,
      },
      {
        actualPassword: password.hash,
        authenticationPassword: `${password.plaintext} `,
      },
      {
        actualPassword: password.hash,
        authenticationPassword: ` ${password.plaintext}`,
      },
      {
        actualPassword: password.hash,
        authenticationPassword: ` ${password.plaintext} `,
      },
    ])(
      'should reject when password does not match',
      async ({ actualPassword, authenticationPassword }) => {
        const stationId = faker.string.uuid().toString();
        givenPassword(stationId, actualPassword);

        await expect(
          filter.authenticate(
            stationId,
            aRequestWithAuthorization(
              basicAuth(stationId, authenticationPassword),
            ),
            authenticationOptions,
          ),
        ).rejects.toThrow(`Unauthorized ${stationId}`);
      },
    );

    it.each([
      {
        actualPassword: password.hash,
        authenticationPassword: password.plaintext,
      },
      {
        actualPassword: anotherPassword.hash,
        authenticationPassword: anotherPassword.plaintext,
      },
    ])(
      'should do nothing when password matches',
      async ({ actualPassword, authenticationPassword }) => {
        const stationId = faker.string.uuid().toString();
        givenPassword(stationId, actualPassword);

        await expect(async () => {
          await filter.authenticate(
            stationId,
            aRequestWithAuthorization(
              basicAuth(stationId, authenticationPassword),
            ),
            authenticationOptions,
          );
        }).not.toThrow();
      },
    );
  });

  describe.each([0, 3])(`given %i security profile`, (securityProfile) => {
    const authenticationOptions = anAuthenticationOptions({
      securityProfile,
      allowUnknownChargingStations: faker.datatype.boolean(),
    });

    it('should do nothing when missing Authorization header', async () => {
      const stationId = faker.string.uuid().toString();

      await filter.authenticate(
        stationId,
        aRequestWithAuthorization(undefined),
        authenticationOptions,
      );
      expect(deviceModelRepository.readAllByQuerystring).not.toHaveBeenCalled();
    });

    it('should do nothing when Authorization header is present', async () => {
      const stationId = faker.string.uuid().toString();

      await filter.authenticate(
        stationId,
        aRequestWithAuthorization(basicAuth(stationId, password.plaintext)),
        authenticationOptions,
      );

      expect(deviceModelRepository.readAllByQuerystring).not.toHaveBeenCalled();
    });
  });

  function givenPassword(stationId: string, passwordHash: string): void {
    const passwordVariable = aBasicAuthPasswordVariable({
      stationId: stationId,
      value: passwordHash,
    } as Partial<VariableAttribute>);

    deviceModelRepository.readAllByQuerystring.mockResolvedValue([
      passwordVariable,
    ]);
  }

  function givenNoPassword() {
    deviceModelRepository.readAllByQuerystring.mockResolvedValue([]);
  }
});
