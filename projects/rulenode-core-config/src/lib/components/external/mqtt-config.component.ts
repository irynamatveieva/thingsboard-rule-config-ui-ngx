import { Component, OnDestroy } from '@angular/core';
import { AppState, isNotEmptyStr } from '@core/public-api';
import { RuleNodeConfiguration, RuleNodeConfigurationComponent } from '@shared/public-api';
import { Store } from '@ngrx/store';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'tb-external-node-mqtt-config',
  templateUrl: './mqtt-config.component.html',
  styleUrls: ['./mqtt-config.component.scss']
})
export class MqttConfigComponent extends RuleNodeConfigurationComponent {

  mqttConfigForm: UntypedFormGroup;

  constructor(protected store: Store<AppState>,
              private fb: UntypedFormBuilder) {
    super(store);
  }

  protected configForm(): UntypedFormGroup {
    return this.mqttConfigForm;
  }

  protected onConfigurationSet(configuration: RuleNodeConfiguration) {
    this.mqttConfigForm = this.fb.group({
      topicPattern: [configuration ? configuration.topicPattern : null, [Validators.required]],
      host: [configuration ? configuration.host : null, [Validators.required]],
      port: [configuration ? configuration.port : null, [Validators.required, Validators.min(1), Validators.max(65535)]],
      connectTimeoutSec: [configuration ? configuration.connectTimeoutSec : null,
        [Validators.required, Validators.min(1), Validators.max(200)]],
      clientId: [configuration ? configuration.clientId : null, []],
      appendClientIdSuffix: [{
        value: configuration ? configuration.appendClientIdSuffix : false,
        disabled: !(configuration && isNotEmptyStr(configuration.clientId))
      }, []],
      parseToPlainText: [configuration ? configuration.parseToPlainText : false, []],
      cleanSession: [configuration ? configuration.cleanSession : false, []],
      retainedMessage: [configuration ? configuration.retainedMessage : false, []],
      ssl: [configuration ? configuration.ssl : false, []],
      credentials: [configuration ? configuration.credentials : null, []]
    });
  }

  protected updateValidators(emitEvent: boolean) {
    if (isNotEmptyStr(this.mqttConfigForm.get('clientId').value)) {
      this.mqttConfigForm.get('appendClientIdSuffix').enable({emitEvent: false});
    } else {
      this.mqttConfigForm.get('appendClientIdSuffix').disable({emitEvent: false});
    }
    this.mqttConfigForm.get('appendClientIdSuffix').updateValueAndValidity({emitEvent});
  }

  protected validatorTriggers(): string[] {
    return ['clientId'];
  }
}
