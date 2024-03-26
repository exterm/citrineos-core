// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {SequelizeRepository} from "./Base";
import {MessageInfo} from "../model/MessageInfo";
import {IMessageInfoRepository} from "../../../interfaces";
import {ComponentType, MessageInfoType} from "@citrineos/base";
import {Component} from "../model/DeviceModel";

export class MessageInfoRepository extends SequelizeRepository<MessageInfo> implements IMessageInfoRepository {
    async deactivateAllByStationId(stationId: string): Promise<void> {
        await MessageInfo.update({
                active: false
            },
            {
                where: {
                    stationId: stationId,
                    active: true
                },
                returning: false
            }
        );
    }

    async createOrUpdateByMessageInfoTypeAndStationId(message: MessageInfoType, stationId: string): Promise<MessageInfo> {
        let matchedComponentId: string | null = null;
        if (message.display) {
            const componentType = message.display as ComponentType;
            const component = await Component.findOne({
                where: {name: componentType.name, instance: componentType.instance ? componentType.instance : null}
            });
            if (component) {
                matchedComponentId = component.id;
            }
        }

        const [savedMessageInfo, messageInfoCreated] = await MessageInfo.upsert({
            stationId: stationId,
            componentId: matchedComponentId,
            id: message.id,
            priority: message.priority,
            state: message.state,
            startDateTime: message.startDateTime,
            endDateTime: message.endDateTime,
            transactionId: message.transactionId,
            message: message.message,
            active: true
        })
        return savedMessageInfo;
    }
}